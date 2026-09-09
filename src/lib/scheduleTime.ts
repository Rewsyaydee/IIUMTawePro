import type { ScheduleItem } from "../types";

export type ScheduleStatus = "done" | "live" | "upcoming";

const EVENT_WEEK_MONDAY = new Date(2026, 7, 3); // August 3, 2026 — Day 0 of the loop template
// Real date that maps to Day 0 (Aug 3). Anchored 2026-08-07 so today (Sun Aug 9)
// shows Day 2 = Wednesday 5 Aug; the 7-day schedule then cycles forever.
const LOOP_ANCHOR = new Date(2026, 7, 7);
const DAY_MS = 24 * 60 * 60 * 1000;

// Production programme window (REAL TAWE SCHEDULE.md, Semester 1 2026/2027).
// Inside this window the app clock is the REAL date (identity mode) and the
// schedule rows are the real 10-25 Sep programme. Outside, the 7-day loop stays
// for previews.
const PROGRAMME_START = "2026-09-10";
const PROGRAMME_END = "2026-09-25";

function localIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isInProgrammeWindow(now: Date = new Date()): boolean {
  const iso = localIsoDate(now);
  return iso >= PROGRAMME_START && iso <= PROGRAMME_END;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function daysSinceAnchor(now: Date): number {
  return Math.round((startOfDay(now) - startOfDay(LOOP_ANCHOR)) / DAY_MS);
}

export function getVirtualScheduleDate(now: Date = new Date()): Date {
  // Production: the schedule is the real programme — the virtual date IS today.
  if (isInProgrammeWindow(now)) return now;
  const index = ((daysSinceAnchor(now) % 7) + 7) % 7;
  const virtual = new Date(EVENT_WEEK_MONDAY);
  virtual.setDate(EVENT_WEEK_MONDAY.getDate() + index);
  virtual.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return virtual;
}

// Real week index since the loop anchor — keeps attendance block keys unique per
// week so the same looping session can be checked in again each cycle. In the
// production programme window every real date is unique, so the cycle is 0.
export function getLoopCycleKey(now: Date = new Date()): string {
  if (isInProgrammeWindow(now)) return "0";
  return String(Math.floor(daysSinceAnchor(now) / 7));
}

// Attendance block id: virtual date + block + week cycle.
// e.g. block-2026-08-05-before_break-w0
export function buildBlockId(virtualDate: string, block: string, now: Date = new Date()): string {
  return `block-${virtualDate}-${block}-w${getLoopCycleKey(now)}`;
}

export function scheduleDateTime(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

export function getScheduleClock(items: ScheduleItem[], now = new Date()) {
  // Always-on 7-day loop: the app clock is always the virtual looping date.
  void items;
  return { now: getVirtualScheduleDate(now), isDemo: false };
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
