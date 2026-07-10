import type { ScheduleItem } from "../types";

export type ScheduleStatus = "done" | "live" | "upcoming";

const demoNow = new Date(2026, 1, 24, 10, 0);

export function scheduleDateTime(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

export function getScheduleClock(items: ScheduleItem[], now = new Date()) {
  if (items.length === 0) return { now, isDemo: false };

  const starts = items.map((item) => scheduleDateTime(item.date, item.scheduledStartTime).getTime());
  const ends = items.map((item) => scheduleDateTime(item.date, item.scheduledEndTime).getTime());
  const eventStart = Math.min(...starts);
  const eventEnd = Math.max(...ends);
  const current = now.getTime();

  if (current >= eventStart && current <= eventEnd) {
    return { now, isDemo: false };
  }

  return { now: demoNow, isDemo: true };
}

export function getScheduleStatus(item: ScheduleItem, now: Date): ScheduleStatus {
  const start = scheduleDateTime(item.date, item.scheduledStartTime).getTime();
  const end = scheduleDateTime(item.date, item.scheduledEndTime).getTime();
  const current = now.getTime();

  if (current >= start && current < end) return "live";
  if (current >= end) return "done";
  return "upcoming";
}

export function getItemProgress(item: ScheduleItem, now: Date) {
  const start = scheduleDateTime(item.date, item.scheduledStartTime).getTime();
  const end = scheduleDateTime(item.date, item.scheduledEndTime).getTime();
  const duration = Math.max(end - start, 1);
  const elapsed = Math.min(Math.max(now.getTime() - start, 0), duration);
  return Math.round((elapsed / duration) * 100);
}

export function getCurrentScheduleItem(items: ScheduleItem[], now: Date) {
  const ordered = [...items].sort((a, b) => scheduleDateTime(a.date, a.scheduledStartTime).getTime() - scheduleDateTime(b.date, b.scheduledStartTime).getTime());
  const live = ordered
    .filter((item) => getScheduleStatus(item, now) === "live")
    .sort((a, b) => scheduleDateTime(b.date, b.scheduledStartTime).getTime() - scheduleDateTime(a.date, a.scheduledStartTime).getTime());

  if (live.length > 0) return live[0];

  const upcoming = ordered.find((item) => getScheduleStatus(item, now) === "upcoming");
  if (upcoming) return upcoming;

  return ordered[ordered.length - 1];
}

export function getTaweWeekProgress(items: ScheduleItem[], now: Date) {
  const eventItems = items.filter((item) => item.week === "event_week");
  if (eventItems.length === 0) return 0;

  const start = Math.min(...eventItems.map((item) => scheduleDateTime(item.date, item.scheduledStartTime).getTime()));
  const end = Math.max(...eventItems.map((item) => scheduleDateTime(item.date, item.scheduledEndTime).getTime()));
  const duration = Math.max(end - start, 1);
  const elapsed = Math.min(Math.max(now.getTime() - start, 0), duration);

  return Math.round((elapsed / duration) * 100);
}

export function formatScheduleClock(now: Date) {
  return now.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}
