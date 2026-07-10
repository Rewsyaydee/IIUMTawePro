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

export function StudentAttendanceView() {
  const { user } = useMockUser();
  const { schedule } = useMockData();
  const apiMode = shouldUseApiAuth();
  const [attendances, setAttendances] = useState<StudentAttendance[]>([]);
  const [authTick, setAuthTick] = useState(0);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [showExcuse, setShowExcuse] = useState<string | null>(null);
  const [excuseText, setExcuseText] = useState("");
  const [error, setError] = useState("");

  const requiredToday = schedule.filter(
    (s) => s.isAttendanceRequired
  );

  const allRequired = requiredToday;

  useEffect(() => {
    const h = () => setAuthTick(v => v + 1);
    window.addEventListener(authSessionChangedEvent, h);
    return () => window.removeEventListener(authSessionChangedEvent, h);
  }, []);

  useEffect(() => {
    if (!apiMode) return;
    let c = false;
    listStudentAttendance().then(a => { if (!c) setAttendances(a); }).catch(() => {});
    return () => { c = true; };
  }, [apiMode, authTick]);

  const getStatus = (scheduleItemId: string): StudentAttendanceStatus | null => {
    return attendances.find(a => a.scheduleItemId === scheduleItemId)?.status || null;
  };

  const presentCount = attendances.filter(a => a.status === "present" || a.status === "excused").length;
  const totalRequired = 9;

  const handleSubmit = async (item: typeof requiredToday[number], isAbsent: boolean) => {
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
        setAttendances(prev => [record, ...prev.filter(a => a.scheduleItemId !== item.id)]);
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

  const statusIcon = (status: StudentAttendanceStatus | null) => {
    if (status === "present") return <CheckCircle2 size={16} color="var(--green)" />;
    if (status === "absent") return <XCircleIcon size={16} color="var(--red)" />;
    if (status === "excused") return <CheckCircle2 size={16} color="var(--amber)" />;
    return <Clock size={16} color="var(--tg-hint-color)" />;
  };

  return (
    <section className="page-stack">
      <div className="attendance-student-hero">
        <div>
          <strong>Your Attendance</strong>
          <span>{presentCount} / {totalRequired} events · {totalRequired - presentCount} remaining for kit eligibility</span>
          <div className="attendance-progress-bar">
            <span style={{ width: `${Math.round((presentCount / totalRequired) * 100)}%` }} />
          </div>
        </div>
        <div className="attendance-kit-badge" data-eligible={presentCount >= totalRequired}>
          {presentCount >= totalRequired ? "Eligible" : "Incomplete"}
        </div>
      </div>

      {error && <p className="access-error">{error}</p>}

      {allRequired.length === 0 ? (
        <div className="empty-state">
          <CheckCircle2 size={24} />
          <strong>No attendance events today</strong>
          <p>Required events will appear here when scheduled.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {allRequired.map((item) => {
            const status = getStatus(item.id);
            const isSubmitted = status !== null;

            return (
              <motion.article
                key={item.id}
                className="attendance-event-card"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="attendance-event-header">
                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.scheduledStartTime} - {item.scheduledEndTime} · {item.venue}</p>
                  </div>
                  {statusIcon(status)}
                </div>

                {!isSubmitted && (
                  <div className="attendance-event-actions">
                    <button
                      className="verify-button"
                      disabled={submitting === item.id}
                      onClick={() => handleSubmit(item, false)}
                    >
                      <MapPin size={14} />
                      <span>{submitting === item.id ? "Detecting..." : "Submit Attendance"}</span>
                    </button>
                    {showExcuse !== item.id ? (
                      <button
                        className="danger-outline-button"
                        onClick={() => { setShowExcuse(item.id); setExcuseText(""); }}
                      >
                        <span>Absent / Excuse</span>
                      </button>
                    ) : (
                      <div className="attendance-excuse-form">
                        <textarea
                          rows={2}
                          placeholder="Reason for absence..."
                          value={excuseText}
                          onChange={(e) => setExcuseText(e.target.value)}
                        />
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button className="danger-outline-button" onClick={() => handleSubmit(item, true)} disabled={submitting === item.id || !excuseText.trim()}>
                            Submit Excuse
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
                  <div className="attendance-event-status">
                    <span className={`status-badge status-${status === "present" ? "done" : status === "absent" ? "rejected" : "responded"}`}>
                      {status === "present" ? "Present" : status === "absent" ? "Absent" : "Excused"}
                    </span>
                  </div>
                )}
              </motion.article>
            );
          })}
        </div>
      )}
    </section>
  );
}
