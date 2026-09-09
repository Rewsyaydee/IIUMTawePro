import { supabaseRequest } from "./supabase.js";

// Server-side replica of src/lib/scheduleTime.ts (7-day always-on loop).
// All wall-clock math is done in Malaysia time (UTC+8) so the server in UTC
// matches what students on Malaysian devices see.

const DAY_MS = 24 * 60 * 60 * 1000;
const KL_OFFSET_MS = 8 * 60 * 60 * 1000;
// Template Day 0 (2026-08-03) and the real anchor date (2026-08-07) that maps
// to Day 0 — must stay in sync with src/lib/scheduleTime.ts.
const LOOP_ANCHOR_UTC = Date.UTC(2026, 7, 7);

// Production programme window (REAL TAWE SCHEDULE.md): inside it the server
// clock is the real date (identity mode) and schedule rows carry real dates.
// Outside it the 7-day preview loop applies.
const PROGRAMME_START = "2026-09-10";
const PROGRAMME_END = "2026-09-25";

function isInProgrammeWindowIso(isoDate) {
  return isoDate >= PROGRAMME_START && isoDate <= PROGRAMME_END;
}

function startOfKlDay(now) {
  const kl = new Date(now.getTime() + KL_OFFSET_MS);
  return new Date(Date.UTC(kl.getUTCFullYear(), kl.getUTCMonth(), kl.getUTCDate()) - KL_OFFSET_MS);
}

function daysSinceAnchor(now) {
  return Math.round((startOfKlDay(now).getTime() - startOfKlDay(new Date(LOOP_ANCHOR_UTC)).getTime()) / DAY_MS);
}

function klParts(now) {
  const kl = new Date(now.getTime() + KL_OFFSET_MS);
  return {
    h: kl.getUTCHours(),
    min: kl.getUTCMinutes(),
    s: kl.getUTCSeconds(),
    ms: kl.getUTCMilliseconds()
  };
}

export function getVirtualScheduleDate(now = new Date()) {
  if (isInProgrammeWindowIso(formatIsoDate(now))) return now;
  const index = ((daysSinceAnchor(now) % 7) + 7) % 7;
  const p = klParts(now);
  return new Date(Date.UTC(2026, 7, 3 + index, p.h, p.min, p.s, p.ms) - KL_OFFSET_MS);
}

export function formatIsoDate(date) {
  const kl = new Date(date.getTime() + KL_OFFSET_MS);
  return `${kl.getUTCFullYear()}-${String(kl.getUTCMonth() + 1).padStart(2, "0")}-${String(kl.getUTCDate()).padStart(2, "0")}`;
}

export function getLoopCycleKey(now = new Date()) {
  if (isInProgrammeWindowIso(formatIsoDate(now))) return "0";
  return String(Math.floor(daysSinceAnchor(now) / 7));
}

export function isProgrammeDateIso(isoDate) {
  return isInProgrammeWindowIso(String(isoDate || ""));
}

export function buildBlockId(virtualDate, block, now = new Date()) {
  return `block-${virtualDate}-${block}-w${getLoopCycleKey(now)}`;
}

const BLOCK_ID_RE = /^block-(\d{4}-\d{2}-\d{2})-(before_break|after_break)-w(-?\d+)$/;

export function parseBlockId(id) {
  const match = BLOCK_ID_RE.exec(String(id || ""));
  if (!match) return null;
  return { date: match[1], block: match[2], cycle: match[3] };
}

// "HH:MM" wall-clock time on a given YYYY-MM-DD interpreted as Malaysia time.
export function klEventTimeMs(dateIso, time) {
  if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return null;
  const [h, m] = String(time || "").split(":").map(Number);
  if (!Number.isFinite(h) || h < 0 || h > 23) return null;
  return Date.parse(`${dateIso}T${String(h).padStart(2, "0")}:${String(Number.isFinite(m) ? m : 0).padStart(2, "0")}:00+08:00`);
}

// Global session delay (minutes) set by mainboard in the ops dashboard.
export async function getSessionDelayMinutes() {
  try {
    const rows = await supabaseRequest("/ops_settings?key=eq.session_delay_minutes&select=value&limit=1");
    const value = Array.isArray(rows) ? rows[0]?.value : undefined;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

// Active window for one session block: from the earliest event start until the
// final event's end (+ optional delay). Returns null when the block has no
// scheduled items (or the delay lookup fails open).
export async function getActiveSessionWindow({ blockGroup, block, delayMinutes = 0 }) {
  const rows = await supabaseRequest(
    `/schedule_items?block_group=eq.${encodeURIComponent(blockGroup)}&block=eq.${encodeURIComponent(block)}&is_concurrent=is.false&select=scheduled_start_time,scheduled_end_time&limit=100`
  );
  const items = Array.isArray(rows) ? rows : [];
  if (items.length === 0) return null;

  let windowStart = Infinity;
  let windowEnd = -Infinity;
  for (const item of items) {
    const s = klEventTimeMs(blockGroup, item.scheduled_start_time);
    const e = klEventTimeMs(blockGroup, item.scheduled_end_time);
    if (s === null || e === null) continue;
    if (s < windowStart) windowStart = s;
    if (e > windowEnd) windowEnd = e;
  }
  if (!Number.isFinite(windowStart)) return null;

  return {
    windowStart,
    windowEnd: windowEnd + delayMinutes * 60 * 1000
  };
}
