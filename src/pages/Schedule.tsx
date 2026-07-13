import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Clock3 } from "lucide-react";
import { formatScheduleClock, getScheduleClock, getScheduleStatus, scheduleDateTime } from "../lib/scheduleTime";
import { hapticImpact, hapticSuccess } from "../lib/telegram";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import type { ScheduleItem } from "../types";

type SelectedView = "main" | "concurrent";

const EVENT_DATES = [
  { iso: "2026-02-22", day: "Sun", label: "22" },
  { iso: "2026-02-23", day: "Mon", label: "23" },
  { iso: "2026-02-24", day: "Tue", label: "24" },
  { iso: "2026-02-25", day: "Wed", label: "25" },
  { iso: "2026-02-26", day: "Thu", label: "26" },
  { iso: "2026-02-27", day: "Fri", label: "27" },
  { iso: "2026-02-28", day: "Sat", label: "28" }
];

function formatDayLabel(iso: string): string {
  const [, month, day] = iso.split("-");
  const date = new Date(parseInt(iso.slice(0, 4)), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString("en-MY", { weekday: "short" });
}

function formatDateShort(iso: string): string {
  const [, month, day] = iso.split("-");
  const date = new Date(parseInt(iso.slice(0, 4)), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString("en-MY", { day: "2-digit", month: "short" });
}

function Schedule() {
  const { user } = useMockUser();
  const { schedule, studentAttendances } = useMockData();
  const [clockTick, setClockTick] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedView, setSelectedView] = useState<SelectedView>("main");
  const nowRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scheduleClock = useMemo(() => getScheduleClock(schedule), [clockTick, schedule]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick((v) => v + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const nowIso = scheduleClock.now;
    const todayStr = `${nowIso.getFullYear()}-${String(nowIso.getMonth() + 1).padStart(2, "0")}-${String(nowIso.getDate()).padStart(2, "0")}`;
    const match = EVENT_DATES.find((d) => d.iso === todayStr);
    setSelectedDate(match ? match.iso : EVENT_DATES[0].iso);
  }, [scheduleClock.isDemo]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      nowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => window.clearTimeout(t);
  }, [selectedDate, selectedView]);

  const dayItems = useMemo(() => {
    if (!selectedDate) return [];
    return schedule
      .filter((s) => s.date === selectedDate && s.week === "event_week")
      .sort((a, b) => a.scheduledStartTime.localeCompare(b.scheduledStartTime));
  }, [schedule, selectedDate]);

  const beforeBreakItems = dayItems.filter((s) => s.block === "before_break");
  const afterBreakItems = dayItems.filter((s) => s.block === "after_break");
  const noBlockItems = dayItems.filter((s) => !s.block);
  const concurrentItems = dayItems.filter((s) => s.isConcurrent);

  const isBlockAttended = (blockType: "before_break" | "after_break"): boolean => {
    const blockId = `block-${selectedDate}-${blockType}`;
    return studentAttendances.some(
      (a) => a.userId === user.id && a.scheduleItemId === blockId && (a.status === "present" || a.status === "excused")
    );
  };

  const handleCheckIn = () => {
    hapticSuccess();
  };

  const handleDateClick = (iso: string) => {
    hapticImpact("light");
    setSelectedDate(iso);
  };

  const handleViewToggle = (view: SelectedView) => {
    hapticImpact("light");
    setSelectedView(view);
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
            <motion.span
              className="timeline-now-badge"
              animate={{ color: ["#E5D3B3", "#ffffff", "#E5D3B3"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              NOW
            </motion.span>
          )}
          {status === "done" && (
            <span className="timeline-past-label">PAST</span>
          )}
        </div>
        {item.track && (
          <span className="timeline-track-label">{item.track}</span>
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
        onClick={handleCheckIn}
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
          {EVENT_DATES.map((d) => (
            <button
              key={d.iso}
              className={`schedule-date-btn ${selectedDate === d.iso ? "active" : ""}`}
              onClick={() => handleDateClick(d.iso)}
            >
              <span className="schedule-date-day">{formatDayLabel(d.iso)}</span>
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
        </div>
      </div>
    </section>
  );
}

export default Schedule;
