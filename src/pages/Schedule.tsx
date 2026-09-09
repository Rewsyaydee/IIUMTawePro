import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, MapPin, Clock3, PenLine, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatScheduleClock, getScheduleClock, getScheduleStatus, isProgrammeDateIso, scheduleDateTime, buildBlockId } from "../lib/scheduleTime";
import { hapticError, hapticImpact, hapticSuccess } from "../lib/telegram";
import { playSfx } from "../lib/sfx";
import { ColorSweepText } from "../components/ColorSweepText";
import { shouldUseApiAuth } from "../lib/apiAuth";
import { useApiSchedule } from "../lib/apiHooks";
import { deleteScheduleItemApi, updateScheduleItem } from "../lib/scheduleApi";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import type { ScheduleItem } from "../types";

type SelectedView = "main" | "concurrent";

type DateNav = { iso: string; day: string; label: string };

function buildDateNav(items: ScheduleItem[]): DateNav[] {
  // Only real programme dates (10-25 Sep) ever appear in the nav — stale or
  // stray rows can't pollute the selector.
  const dates = [...new Set(items.map((s) => s.date))].filter((iso) => isProgrammeDateIso(iso)).sort();
  return dates.map((iso) => {
    const date = new Date(`${iso}T00:00:00`);
    return {
      iso,
      day: date.toLocaleDateString("en-MY", { weekday: "short" }),
      label: String(date.getDate()).padStart(2, "0")
    };
  });
}

function Schedule() {
  const { user } = useMockUser();
  const { schedule, studentAttendances } = useMockData();
  const apiMode = shouldUseApiAuth();
  const navigate = useNavigate();
  const [clockTick, setClockTick] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedView, setSelectedView] = useState<SelectedView>("main");
  const nowRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [editForm, setEditForm] = useState({ title: "", venue: "", scheduledStartTime: "", scheduledEndTime: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const isMainboard = user.role === "mainboard";

  const { items: remoteSchedule, loading: loadingSchedule, reload: reloadSchedule } = useApiSchedule(apiMode);
  const activeSchedule = apiMode ? remoteSchedule : schedule;

  const scheduleClock = useMemo(() => getScheduleClock(activeSchedule), [clockTick, activeSchedule]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick((v) => v + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const eventDates = useMemo(() => buildDateNav(activeSchedule), [activeSchedule]);

  useEffect(() => {
    const nowIso = scheduleClock.now;
    const todayStr = `${nowIso.getFullYear()}-${String(nowIso.getMonth() + 1).padStart(2, "0")}-${String(nowIso.getDate()).padStart(2, "0")}`;
    const match = eventDates.find((d) => d.iso === todayStr);
    setSelectedDate(match ? match.iso : eventDates[0]?.iso || "");
  }, [scheduleClock.isDemo, eventDates]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      nowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => window.clearTimeout(t);
  }, [selectedDate, selectedView]);

  const dayItems = useMemo(() => {
    if (!selectedDate) return [];
    return activeSchedule
      .filter((s) => s.date === selectedDate)
      .sort((a, b) => a.scheduledStartTime.localeCompare(b.scheduledStartTime));
  }, [activeSchedule, selectedDate]);

  const beforeBreakItems = dayItems.filter((s) => s.block === "before_break");
  const afterBreakItems = dayItems.filter((s) => s.block === "after_break");
  const noBlockItems = dayItems.filter((s) => !s.block && !s.isConcurrent);
  const concurrentItems = dayItems.filter((s) => s.isConcurrent);

  const isBlockAttended = (blockType: "before_break" | "after_break"): boolean => {
    const blockId = buildBlockId(selectedDate, blockType);
    return studentAttendances.some(
      (a) => a.userId === user.id && a.scheduleItemId === blockId && (a.status === "present" || a.status === "excused")
    );
  };

  const handleCheckIn = (blockType: "before_break" | "after_break") => {
    hapticSuccess();
    playSfx("forward");
    const blockLabel = blockType === "before_break" ? "Morning Session" : "Afternoon Session";
    const blockId = buildBlockId(selectedDate, blockType);
    const blockItems = activeSchedule.filter((s) => s.date === selectedDate && s.block === blockType && !s.isConcurrent);
    const venueCodes = [...new Set(blockItems.map((i) => i.venueCode).filter(Boolean))] as string[];
    navigate("/attendance", { state: { blockLabel, blockId, venueCodes } });
  };

  const handleDateClick = (iso: string) => {
    hapticImpact("light");
    if (iso !== selectedDate) playSfx("select");
    setSelectedDate(iso);
  };

  const handleViewToggle = (view: SelectedView) => {
    hapticImpact("light");
    if (view !== selectedView) playSfx("select");
    setSelectedView(view);
  };

  const startEditItem = (item: ScheduleItem) => {
    setEditForm({ title: item.title, venue: item.venue, scheduledStartTime: item.scheduledStartTime, scheduledEndTime: item.scheduledEndTime });
    setEditingItem(item);
    setEditError("");
    hapticImpact("light");
    playSfx("open");
  };

  const saveEditItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !editingItem) return;
    setSaving(true);
    setEditError("");
    try {
      if (apiMode) {
        await updateScheduleItem(editingItem.id, editForm);
      }
      setEditingItem(null);
      reloadSchedule();
      hapticSuccess();
      playSfx("success");
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Failed to update session.");
      hapticError();
      playSfx("error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setEditError("");
    try {
      if (apiMode) {
        await deleteScheduleItemApi(id);
      }
      setConfirmDeleteId(null);
      reloadSchedule();
      hapticSuccess();
      playSfx("delete");
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Failed to delete session.");
      hapticError();
      playSfx("error");
    }
  };

  const renderEventCard = (item: ScheduleItem, index: number) => {
    const status = getScheduleStatus(item, scheduleClock.now);
    const statusClass = status === "live" ? "now" : status === "done" ? "past" : "upcoming";
    const isRequired = Boolean(item.isAttendanceRequired);
    const hasNowRef = status === "live" && !nowRef.current;

    return (
      <motion.div
        key={item.id}
        ref={hasNowRef ? nowRef : undefined}
        className={`timeline-event-card ${statusClass}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
      >
        <div className="timeline-event-header">
          <span className={`timeline-event-dot ${isRequired ? "required" : "optional"}`} />
          <div className="timeline-event-info">
            <strong>{item.title}</strong>
            <span>
              <MapPin size={11} /> {item.venue}
            </span>
            <span>
              <Clock3 size={11} /> {item.scheduledStartTime} - {item.scheduledEndTime}
            </span>
          </div>
          {status === "live" && (
            <span className="timeline-now-badge">
              <ColorSweepText text="NOW" />
            </span>
          )}
          {status === "done" && (
            <span className="timeline-past-label">PAST</span>
          )}
          {isMainboard && apiMode && (
            <div className="inline-row-actions" onClick={(e) => e.stopPropagation()}>
              {confirmDeleteId === item.id ? (
                <div className="inline-confirm">
                  <span>Delete?</span>
                  <button type="button" className="danger-outline-button" onClick={() => handleDeleteItem(item.id)}>Yes</button>
                  <button type="button" className="outline-button" onClick={() => { playSfx("cancel"); setConfirmDeleteId(null); }}>No</button>
                </div>
              ) : (
                <button className="icon-button" type="button" aria-label="Delete session" onClick={() => { playSfx("press"); setConfirmDeleteId(item.id); }}>
                  <Trash2 size={14} />
                </button>
              )}
              <button className="icon-button" type="button" aria-label="Edit session" onClick={() => startEditItem(item)}>
                <PenLine size={14} />
              </button>
            </div>
          )}
        </div>
        {item.track && (
          <span className="timeline-track-label">{item.track}</span>
        )}
        {isMainboard && apiMode && editingItem?.id === item.id && (
          <motion.form className="form-card compact inline-editor" onSubmit={saveEditItem} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="form-grid">
              <label>
                <span>Title</span>
                <input required value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
              </label>
              <label>
                <span>Venue</span>
                <input required value={editForm.venue} onChange={(e) => setEditForm((f) => ({ ...f, venue: e.target.value }))} />
              </label>
            </div>
            <div className="form-grid">
              <label>
                <span>Start</span>
                <input required type="time" value={editForm.scheduledStartTime} onChange={(e) => setEditForm((f) => ({ ...f, scheduledStartTime: e.target.value }))} />
              </label>
              <label>
                <span>End</span>
                <input required type="time" value={editForm.scheduledEndTime} onChange={(e) => setEditForm((f) => ({ ...f, scheduledEndTime: e.target.value }))} />
              </label>
            </div>
            {editError && (
              <p className="muted" style={{ color: "#c93d37" }}>{editError}</p>
            )}
            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={saving}>
                <Check size={15} aria-hidden="true" />
                <span>{saving ? "..." : "Save"}</span>
              </button>
              <button className="outline-button" type="button" onClick={() => { playSfx("cancel"); setEditingItem(null); }}>Cancel</button>
            </div>
          </motion.form>
        )}
      </motion.div>
    );
  };

  const renderCheckInButton = (label: string, blockType: "before_break" | "after_break", index: number) => {
    const attended = isBlockAttended(blockType);
    return (
      <motion.button
        key={`checkin-${blockType}`}
        className={`check-in-inline ${attended ? "checked" : ""}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        disabled={attended}
        onClick={() => handleCheckIn(blockType)}
      >
        {attended ? `✓ ${label} — Checked In` : `Check In: ${label} ✓`}
      </motion.button>
    );
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Programme</p>
          <h2>Event Schedule</h2>
        </div>
        <span className="soft-chip">
          {scheduleClock.isDemo ? `Preview ${formatScheduleClock(scheduleClock.now)}` : `Live ${formatScheduleClock(scheduleClock.now)}`}
        </span>
      </div>

      <div className="schedule-timeline-layout">
        <div className="schedule-date-nav">
          {eventDates.map((d) => (
            <button
              key={d.iso}
              className={`schedule-date-btn ${selectedDate === d.iso ? "active" : ""}`}
              onClick={() => handleDateClick(d.iso)}
            >
              <span className="schedule-date-day">{d.day}</span>
              <span className="schedule-date-num">{d.label}</span>
            </button>
          ))}
        </div>

        <div className="schedule-content-area" ref={scrollContainerRef}>
          <div className="schedule-toggle">
            <button
              className={`schedule-toggle-btn ${selectedView === "main" ? "active" : ""}`}
              onClick={() => handleViewToggle("main")}
            >
              Main Schedule
            </button>
            <button
              className={`schedule-toggle-btn ${selectedView === "concurrent" ? "active" : ""}`}
              onClick={() => handleViewToggle("concurrent")}
            >
              Concurrent
            </button>
          </div>

          {loadingSchedule ? (
            <div className="skeleton-page" />
          ) : (
            <div className="schedule-events-list">
              {selectedView === "main" ? (
                <>
                  {beforeBreakItems.length > 0 && (
                    <>
                      {beforeBreakItems.map((item, i) => renderEventCard(item, i))}
                      {renderCheckInButton("Morning Session", "before_break", beforeBreakItems.length)}
                    </>
                  )}

                  {afterBreakItems.length > 0 && (
                    <>
                      {afterBreakItems.map((item, i) => renderEventCard(item, i + beforeBreakItems.length))}
                      {renderCheckInButton("Afternoon Session", "after_break", afterBreakItems.length)}
                    </>
                  )}

                  {noBlockItems.length > 0 && (
                    <>
                      {noBlockItems.map((item, i) => renderEventCard(item, i + beforeBreakItems.length + afterBreakItems.length))}
                    </>
                  )}

                  {dayItems.length === 0 && (
                    <div className="timeline-empty">
                      <p>No events scheduled for this day.</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {concurrentItems.length > 0 ? (
                    concurrentItems.map((item, i) => renderEventCard(item, i))
                  ) : (
                    <div className="timeline-empty">
                      <p>No concurrent events for this day.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Schedule;
