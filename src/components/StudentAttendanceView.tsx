import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import { shouldUseApiAuth, authSessionChangedEvent } from "../lib/apiAuth";
import { listStudentAttendance } from "../lib/studentAttendanceApi";
import { CheckInForm } from "./CheckInForm";
import {
  getSessionBlocks,
  getRequiredBlockCount
} from "../data/eventSchedule";
import type { StudentAttendance, StudentAttendanceStatus } from "../types";

type CheckInState = {
  blockLabel: string;
  blockId: string;
  venueCodes: string[];
} | null;

export function StudentAttendanceView({ checkInState }: { checkInState?: CheckInState }) {
  const { user } = useMockUser();
  const { schedule, studentAttendances } = useMockData();
  const apiMode = shouldUseApiAuth();
  const [attendances, setAttendances] = useState<StudentAttendance[]>([]);
  const [authTick, setAuthTick] = useState(0);

  const blocks = getSessionBlocks(schedule);
  const totalRequired = getRequiredBlockCount(schedule);
  const milestones = totalRequired <= 3 ? [1, 2, 3] : totalRequired <= 5 ? [2, 4, 5] : [3, 5, totalRequired];

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

      {checkInState ? (
        <CheckInForm
          blockLabel={checkInState.blockLabel}
          blockId={checkInState.blockId}
          venueCodes={checkInState.venueCodes}
        />
      ) : (
        <div className="check-in-empty glass-card">
          <MapPin size={32} color="var(--gold-accent)" />
          <h3>Ready to Check In?</h3>
          <p>Go to the Schedule page and tap a Check In button to record your attendance for a session block.</p>
          <Link className="check-in-submit" to="/schedule">Go to Schedule</Link>
        </div>
      )}
    </section>
  );
}
