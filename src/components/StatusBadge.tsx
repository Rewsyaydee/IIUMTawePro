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

export function StatusBadge({ value }: { value: BadgeKind }) {
  return <span className={`status-badge status-${value}`}>{value.split("_").join(" ")}</span>;
}
