import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";

export function StreakWidget() {
  const { schedule, studentAttendances } = useMockData();
  const { user } = useMockUser();

  const requiredEvents = schedule.filter((s) => s.isAttendanceRequired);
  const totalRequired = requiredEvents.length || 9;

  const attendedCount = user.role === "student"
    ? studentAttendances.filter(
        (a) => a.userId === user.id && (a.status === "present" || a.status === "excused")
      ).length
    : 0;

  const remaining = Math.max(totalRequired - attendedCount, 0);
  const progressPct = Math.round((attendedCount / totalRequired) * 100);

  return (
    <div className="streak-widget glass-card">
      <div className="streak-left">
        <div className="streak-flame">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C12 2 8 6 8 11C8 14 10 16 12 16C14 16 16 14 16 11C16 6 12 2 12 2Z"
              fill="#E5D3B3"
              opacity="0.9"
            />
            <path
              d="M12 7C12 7 10 9 10 12C10 13.5 11 14.5 12 14.5C13 14.5 14 13.5 14 12C14 9 12 7 12 7Z"
              fill="#fff7e0"
              opacity="0.8"
            />
          </svg>
        </div>
        <div className="streak-number-info">
          <strong className="streak-number">{attendedCount}</strong>
          <span className="streak-label">Events Attended</span>
        </div>
      </div>

      <div className="streak-right">
        <div className="streak-progress-header">
          <span className="streak-progress-title">Ta'aruf Kit Progress</span>
          <span className="streak-progress-count">{attendedCount}/{totalRequired}</span>
        </div>
        <div className="streak-progress-bar">
          <span style={{ width: `${progressPct}%` }} />
        </div>
        <span className="streak-progress-hint">
          {remaining > 0 ? `${remaining} events left to claim` : "Kit eligibility unlocked!"}
        </span>
      </div>
    </div>
  );
}
