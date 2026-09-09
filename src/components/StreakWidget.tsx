import { Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStudentAttendanceSummary } from "../lib/useStudentAttendanceSummary";
import { useActiveSchedule } from "../lib/useActiveSchedule";
import { playSfx } from "../lib/sfx";

export function StreakWidget() {
  const { schedule } = useActiveSchedule();
  const navigate = useNavigate();
  const { attendedCount, totalRequired, remaining } = useStudentAttendanceSummary(schedule);

  const progressPct = totalRequired > 0 ? Math.round((attendedCount / totalRequired) * 100) : 0;

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

      <button
        className="streak-share-btn"
        type="button"
        onClick={() => {
          playSfx("forward");
          navigate("/stories");
        }}
        title="Share your progress"
      >
        <Send size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
