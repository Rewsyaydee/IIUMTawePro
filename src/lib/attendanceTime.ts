function toMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

export { getVirtualScheduleDate } from "./scheduleTime";

function isBetween(value: number, start: number, end: number): boolean {
  return value >= start && value < end;
}

export function isWithinClockInWindow(date: Date = new Date()): boolean {
  const total = toMinutes(date.getHours(), date.getMinutes());
  return isBetween(total, toMinutes(8, 0), toMinutes(8, 30));
}

export function isWithinClockOutWindow(date: Date = new Date()): boolean {
  const total = toMinutes(date.getHours(), date.getMinutes());
  return isBetween(total, toMinutes(17, 0), toMinutes(17, 30));
}

export function getTimeWindow(date: Date = new Date()): "clock-in" | "clock-out" | "none" {
  if (isWithinClockInWindow(date)) return "clock-in";
  if (isWithinClockOutWindow(date)) return "clock-out";
  return "none";
}

export function getClockWindowMessage(date: Date = new Date()): {
  header: string;
  subtext: string;
  window: "clock-in" | "clock-out" | "past";
} {
  const now = toMinutes(date.getHours(), date.getMinutes());

  if (now < toMinutes(8, 0)) {
    return {
      header: "Attendance opens at 8:00 AM",
      subtext: "Clock-in window is 8:00 AM — 8:30 AM",
      window: "clock-in"
    };
  }

  if (isWithinClockInWindow(date)) {
    const remaining = 30 - date.getMinutes();
    return {
      header: `Clock-in window OPEN — ${remaining} min remaining`,
      subtext: "Submit your selfie before 8:30 AM",
      window: "clock-in"
    };
  }

  if (now < toMinutes(17, 0)) {
    return {
      header: "Clock-out at 5:00 PM",
      subtext: "Clock-out window opens at 5:00 PM and closes at 5:30 PM",
      window: "clock-out"
    };
  }

  if (isWithinClockOutWindow(date)) {
    const remaining = 30 - date.getMinutes();
    return {
      header: `Clock-out window OPEN — ${remaining} min remaining`,
      subtext: "Submit your selfie before 5:30 PM",
      window: "clock-out"
    };
  }

  return {
    header: "Attendance windows closed",
    subtext: "Clock-in: 8:00-8:30 AM | Clock-out: 5:00-5:30 PM — opens tomorrow",
    window: "past"
  };
}

export type CommitteeDailyStatus = "present" | "absent" | "pending";

export function getDailyAttendanceStatus(
  clockedIn: boolean,
  clockedOut: boolean,
  now: Date = new Date()
): CommitteeDailyStatus {
  if (clockedIn && clockedOut) return "present";

  const todayEnd = new Date(now);
  todayEnd.setHours(17, 30, 0, 0);

  if (now > todayEnd) return "absent";

  return "pending";
}
