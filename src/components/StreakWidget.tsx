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
          <img src="/assets/flame.svg" alt="Streak flame" />
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
