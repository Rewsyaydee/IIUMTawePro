import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, MapPin, XCircle as XCircleIcon } from "lucide-react";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import { shouldUseApiAuth, authSessionChangedEvent } from "../lib/apiAuth";
import { listStudentAttendance, submitStudentAttendance } from "../lib/studentAttendanceApi";
import { getCurrentPosition } from "../lib/locationVerify";
import { hapticError, hapticSuccess } from "../lib/telegram";
import {
  getSessionBlocks,
  getConcurrentEvents,
  getRequiredBlockCount,
  type SessionBlockInfo
} from "../data/eventSchedule";
import type { StudentAttendance, StudentAttendanceStatus } from "../types";

export function StudentAttendanceView() {
  const { user } = useMockUser();
  const { schedule, studentAttendances } = useMockData();
  const apiMode = shouldUseApiAuth();
  const [attendances, setAttendances] = useState<StudentAttendance[]>([]);
  const [authTick, setAuthTick] = useState(0);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [showExcuse, setShowExcuse] = useState<string | null>(null);
  const [excuseText, setExcuseText] = useState("");
  const [error, setError] = useState("");

  const blocks = getSessionBlocks(schedule);
  const concurrents = getConcurrentEvents(schedule);
  const totalRequired = getRequiredBlockCount(schedule);
  const milestones = totalRequired <= 3 ? [1, 2, 3] : totalRequired <= 5 ? [2, 4, 5] : [3, 5, totalRequired];

  const nonBlockItems = schedule
    .filter((s) => !s.block && s.week === "event_week")
    .sort((a, b) => `${a.date}${a.scheduledStartTime}`.localeCompare(`${b.date}${b.scheduledStartTime}`));

  useEffect(() => {
    const h = () => setAuthTick((v) => v + 1);
    window.addEventListener(authSessionChangedEvent, h);
    return () => window.removeEventListener(authSessionChangedEvent, h);
  }, []);

  useEffect(() => {
    if (!apiMode) {
      setAttendances(studentAttendances.filter((a) => a.userId === user.id));
      return;
    }
    let c = false;
    listStudentAttendance()
      .then((a) => { if (!c) setAttendances(a); })
      .catch(() => {});
    return () => { c = true; };
  }, [apiMode, authTick, studentAttendances, user.id]);

  const getBlockStatus = (blockId: string): StudentAttendanceStatus | null => {
    return attendances.find((a) => a.scheduleItemId === blockId)?.status || null;
  };

  const attendedCount = attendances.filter((a) => a.status === "present" || a.status === "excused").length;
  const remaining = Math.max(totalRequired - attendedCount, 0);
  const nextMilestone = milestones.find((m) => attendedCount < m) || totalRequired;

  const handleSubmitBlock = async (block: SessionBlockInfo, isAbsent: boolean) => {
    if (!user.matricNumber) {
      setError("Please complete onboarding first.");
      return;
    }
    setSubmitting(block.id);
    setError("");
    try {
      let lat = 0, lng = 0;
      if (!isAbsent) {
        try {
          const pos = await getCurrentPosition();
          lat = pos.lat;
          lng = pos.lng;
        } catch {
          setError("Location access required for attendance. Please enable GPS.");
          setSubmitting(null);
          return;
        }
      }

      if (apiMode) {
        const record = await submitStudentAttendance({
          scheduleItemId: block.id,
          eventTitle: block.blockLabel,
          studentName: user.name,
          matricNumber: user.matricNumber,
          kulliyyah: user.kulliyyah,
          latitude: lat,
          longitude: lng,
          status: isAbsent ? "absent" : "present",
          excuse: isAbsent ? excuseText : undefined
        });
        setAttendances((prev) => [record, ...prev.filter((a) => a.scheduleItemId !== block.id)]);
      }
      setShowExcuse(null);
      setExcuseText("");
      hapticSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit.");
      hapticError();
    } finally {
      setSubmitting(null);
    }
  };

  const recentBlocks = blocks.slice(0, 7);

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Your attendance</p>
          <h2>Attendance Tracking</h2>
        </div>
        <span className="soft-chip">{new Date().toLocaleDateString("en-MY", { day: "2-digit", month: "short" })}</span>
      </div>

      {error && <p className="access-error">{error}</p>}

      <div className="attendance-hero-tracker glass-card">
        <div className="attendance-hero-flame">
          <img src="/assets/flame.svg" alt="Attendance flame" />
        </div>
        <strong className="attendance-hero-streak">{attendedCount}</strong>
        <span className="attendance-hero-label">events attended</span>

        <div className="attendance-circles">
          {recentBlocks.map((block, i) => {
            const status = getBlockStatus(block.id);
            const isAttended = status === "present" || status === "excused";
            return (
              <div
                key={block.id}
                className={`attendance-circle ${isAttended ? "attended" : ""}`}
                title={block.blockLabel}
              >
                {isAttended ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a2e23" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="milestone-card glass-card">
        <p className="milestone-title">NEXT REWARD: +200 SP / TAARUF KIT</p>
        <div className="milestone-grid">
          {milestones.map((target) => {
            const reached = attendedCount >= target;
            const isNext = nextMilestone === target && !reached;
            return (
              <div
                key={target}
                className={`milestone-column ${reached ? "reached" : ""} ${isNext ? "current" : ""}`}
              >
                {reached ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#E5D3B3" stroke="none">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="17 8 10 15 7 12" fill="none" stroke="#0a2e23" strokeWidth="2.5" />
                  </svg>
                ) : (
                  <span className="milestone-icon">{target}</span>
                )}
                <span className="milestone-label">{target} Events</span>
              </div>
            );
          })}
        </div>
      </div>

      {concurrents.length > 0 && (
        <div className="ongoing-booth-section">
          {concurrents.map((item) => (
            <div key={item.id} className="ongoing-booth-card glass-card-flat">
              <div className="ongoing-booth-header">
                <div className="ongoing-booth-info">
                  <strong>{item.title}</strong>
                  <span>{item.scheduledStartTime} - {item.scheduledEndTime}</span>
                </div>
                <span className="pill-badge optional">OPTIONAL</span>
              </div>
              <span className="ongoing-booth-subtitle">All-Day Booth · Drop-in Service</span>
            </div>
          ))}
        </div>
      )}

      <div className="session-block-list">
        {blocks.map((block, index) => {
          const status = getBlockStatus(block.id);
          const isSubmitted = status !== null;
          const isAttended = status === "present" || status === "excused";

          const groupMap = new Map<string, typeof block.items>();
          for (const item of block.items) {
            const key = item.blockGroup || "";
            if (!groupMap.has(key)) groupMap.set(key, []);
            groupMap.get(key)!.push(item);
          }
          const groups = Array.from(groupMap.entries());

          return (
            <motion.article
              key={block.id}
              className={`session-block-card glass-card ${isAttended ? "attended" : ""}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <div className="session-block-header">
                <div>
                  <h3 className="session-block-title">{block.blockLabel}</h3>
                  <span className="session-block-time">{block.timeRange}</span>
                </div>
                <span className={`pill-badge ${block.isAttendanceRequired ? "required" : "optional"}`}>
                  {block.isAttendanceRequired ? "REQUIRED" : "OPTIONAL"}
                </span>
              </div>

              <div className="session-block-timeline">
                {groups.map(([groupLabel, items]) => (
                  <div key={groupLabel} className="session-block-group">
                    {groups.length > 1 && (
                      <span className="session-block-group-label">{groupLabel}</span>
                    )}
                    {items.map((item) => (
                      <div key={item.id} className="session-block-sub">
                        <span className="session-block-sub-time">{item.scheduledStartTime} - {item.scheduledEndTime}</span>
                        <span className="session-block-sub-title">{item.title}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {block.isAttendanceRequired && !isSubmitted && (
                <div className="session-block-actions">
                  <button
                    className="verify-button"
                    disabled={submitting === block.id}
                    onClick={() => handleSubmitBlock(block, false)}
                  >
                    <MapPin size={14} />
                    <span>{submitting === block.id ? "Detecting..." : "Check In"}</span>
                  </button>
                  {showExcuse !== block.id ? (
                    <button
                      className="danger-outline-button"
                      onClick={() => { setShowExcuse(block.id); setExcuseText(""); }}
                    >
                      <span>Absent</span>
                    </button>
                  ) : (
                    <div className="attendance-excuse-form">
                      <textarea
                        rows={2}
                        placeholder="Reason for absence..."
                        value={excuseText}
                        onChange={(e) => setExcuseText(e.target.value)}
                      />
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", width: "100%" }}>
                        <button className="danger-outline-button" onClick={() => handleSubmitBlock(block, true)} disabled={submitting === block.id || !excuseText.trim()}>
                          Submit
                        </button>
                        <button className="icon-button" onClick={() => setShowExcuse(null)}>
                          <XCircleIcon size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isSubmitted && (
                <div className="session-block-status">
                  {isAttended ? (
                    <CheckCircle2 size={18} color="var(--gold-accent)" />
                  ) : (
                    <XCircleIcon size={18} color="var(--red)" />
                  )}
                  <span className={`status-badge status-${status === "present" ? "done" : "rejected"}`}>
                    {status === "present" ? "Present" : status === "absent" ? "Absent" : "Excused"}
                  </span>
                </div>
              )}
            </motion.article>
          );
        })}
      </div>

      {nonBlockItems.length > 0 && (
        <div className="event-history-list">
          {nonBlockItems.map((item) => {
            const isRequired = Boolean(item.isAttendanceRequired);
            return (
              <div key={item.id} className="event-history-item glass-card-flat">
                <div className="event-history-left">
                  <strong>{item.title}</strong>
                  <span>{item.date} · {item.scheduledStartTime}–{item.scheduledEndTime}</span>
                </div>
                <span className={`pill-badge ${isRequired ? "required" : "optional"}`}>
                  {isRequired ? "REQUIRED" : "OPTIONAL"}
                </span>
                <div className="event-history-status">
                  <div className="event-history-pending" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
