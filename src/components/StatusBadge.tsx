import type { AttendanceStatus, BureauOperationStatus, Priority, ReadinessStatus, TaskStatus, WellbeingReport } from "../types";

type BadgeKind =
  | AttendanceStatus
  | BureauOperationStatus
  | ReadinessStatus
  | TaskStatus
  | Priority
  | WellbeingReport["status"]
  | "live"
  | "mock"
  | "upcoming";

const WELLBEING_LABELS: Partial<Record<WellbeingReport["status"], string>> = {
  submitted: "Pending",
  responded: "Responding",
  resolved: "Resolved",
  escalated: "Escalated"
};

export function StatusBadge({ value }: { value: BadgeKind }) {
  const label = WELLBEING_LABELS[value as WellbeingReport["status"]] || value.split("_").join(" ");
  return <span className={`status-badge status-${value}`}>{label}</span>;
}
