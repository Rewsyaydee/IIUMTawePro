import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, MapPin, XCircle as XCircleIcon } from "lucide-react";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import { shouldUseApiAuth, authSessionChangedEvent } from "../lib/apiAuth";
import { listStudentAttendance, submitStudentAttendance } from "../lib/studentAttendanceApi";
import { getCurrentPosition } from "../lib/locationVerify";
import { hapticError, hapticSuccess } from "../lib/telegram";
import type { StudentAttendance, StudentAttendanceStatus } from "../types";

const TOTAL_REQUIRED = 9;
const MILESTONES = [3, 6, 9];

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

  const allSchedule = [...schedule].sort(
    (a, b) => `${a.date}${a.scheduledStartTime}`.localeCompare(`${b.date}${b.scheduledStartTime}`)
  );

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

  const getStatus = (scheduleItemId: string): StudentAttendanceStatus | null => {
    return attendances.find((a) => a.scheduleItemId === scheduleItemId)?.status || null;
  };

  const attendedCount = attendances.filter((a) => a.status === "present" || a.status === "excused").length;
  const remaining = Math.max(TOTAL_REQUIRED - attendedCount, 0);
  const progressPct = Math.round((attendedCount / TOTAL_REQUIRED) * 100);

  const handleSubmit = async (item: typeof allSchedule[number], isAbsent: boolean) => {
    if (!user.matricNumber) {
      setError("Please complete onboarding first.");
      return;
    }
    setSubmitting(item.id);
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
          scheduleItemId: item.id,
          eventTitle: item.title,
          studentName: user.name,
          matricNumber: user.matricNumber,
          kulliyyah: user.kulliyyah,
          latitude: lat,
          longitude: lng,
          status: isAbsent ? "absent" : "present",
          excuse: isAbsent ? excuseText : undefined
        });
        setAttendances((prev) => [record, ...prev.filter((a) => a.scheduleItemId !== item.id)]);
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

  const recentRequired = allSchedule.filter((s) => s.isAttendanceRequired).slice(0, 7);

  const nextMilestone = MILESTONES.find((m) => attendedCount < m) || TOTAL_REQUIRED;

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
          {recentRequired.map((item, i) => {
            const status = getStatus(item.id);
            const isAttended = status === "present" || status === "excused";
            return (
              <div
                key={item.id}
                className={`attendance-circle ${isAttended ? "attended" : ""}`}
                title={item.title}
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
          {MILESTONES.map((target) => {
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

      <div className="event-history-list">
        {allSchedule.map((item) => {
          const status = getStatus(item.id);
          const isSubmitted = status !== null;
          const isRequired = Boolean(item.isAttendanceRequired);

          return (
            <motion.article
              key={item.id}
              className="event-history-item glass-card-flat"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="event-history-left">
                <strong>{item.title}</strong>
                <span>{item.date} · {item.scheduledStartTime}–{item.scheduledEndTime}</span>
              </div>

              <span className={`pill-badge ${isRequired ? "required" : "optional"}`}>
                {isRequired ? "REQUIRED" : "OPTIONAL"}
              </span>

              <div className="event-history-status">
                {status === "present" || status === "excused" ? (
                  <CheckCircle2 size={18} color="var(--gold-accent)" />
                ) : status === "absent" ? (
                  <XCircleIcon size={18} color="var(--red)" />
                ) : (
                  <div className="event-history-pending" />
                )}
              </div>

              {isRequired && !isSubmitted && (
                <div className="event-history-actions">
                  <button
                    className="verify-button"
                    disabled={submitting === item.id}
                    onClick={() => handleSubmit(item, false)}
                  >
                    <MapPin size={14} />
                    <span>{submitting === item.id ? "..." : "Check In"}</span>
                  </button>
                  {showExcuse !== item.id ? (
                    <button
                      className="danger-outline-button"
                      onClick={() => { setShowExcuse(item.id); setExcuseText(""); }}
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
                        <button className="danger-outline-button" onClick={() => handleSubmit(item, true)} disabled={submitting === item.id || !excuseText.trim()}>
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
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
