import type { LeaderboardEntry, MahallahRanking } from "../types";
import { allMahallahs } from "../features/navigation/data/mahallahs";

export interface LeaderboardRow {
  user_id: string;
  student_name: string;
  mahallah: string;
  schedule_item_id: string;
  event_title: string;
  submitted_at: string;
  scheduled_start_time: string;
  program_count: number;
  photo_url?: string;
}

export function computeScore(
  submittedAt: string,
  sessionStart: string,
  programCount: number
): { points: number; basePoints: number; window: string } {
  const submit = new Date(submittedAt);
  const [sh, sm] = sessionStart.split(":").map(Number);
  const start = new Date(submit);
  start.setHours(sh, sm, 0, 0);
  const diffMin = (start.getTime() - submit.getTime()) / 60000;

  let base: number;
  let window: string;
  if (diffMin >= 5 && diffMin <= 15)      { base = 150; window = "early_bird"; }
  else if (diffMin >= -5 && diffMin < 5)   { base = 100; window = "on_time"; }
  else if (diffMin >= -15 && diffMin < -5) { base = 50;  window = "late_grace"; }
  else                                      { base = 10;  window = "standard"; }

  return { points: base * programCount, basePoints: base, window };
}

export async function fetchLeaderboardData(): Promise<LeaderboardRow[]> {
  const apiBase = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  const resp = await fetch(`${apiBase}/api/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "leaderboard.fetch" })
  });
  if (!resp.ok) throw new Error("Failed to fetch leaderboard data.");
  const payload = await resp.json();
  return (payload.rows || []) as LeaderboardRow[];
}

export function getMahallahName(code: string): string {
  const m = allMahallahs.find((mh) => mh.code === code);
  return m ? m.name : code;
}

export function getMahallahShort(code: string): string {
  const m = allMahallahs.find((mh) => mh.code === code);
  return m ? m.short : code;
}

// The bot stores display names ("Faruq") while the leaderboard keys on codes
// ("mh-faruq"). Canonicalize any stored value to the mh-* code so rankings,
// labels, and avatars all line up. Unknown values are returned raw (and are
// naturally dropped by rankings that only emit known mahallahs).
export function canonicalMahallah(value: string): string {
  const v = (value || "").trim();
  if (!v) return "";
  if (allMahallahs.some((m) => m.code === v)) return v;
  const byShort = allMahallahs.find((m) => m.short.toLowerCase() === v.toLowerCase());
  if (byShort) return byShort.code;
  const byName = allMahallahs.find((m) => m.name.toLowerCase() === v.toLowerCase());
  return byName ? byName.code : v;
}

export function buildIndividualRanking(
  rows: LeaderboardRow[],
  dateFilter?: string
): LeaderboardEntry[] {
  const filtered = dateFilter ? rows.filter((r) => r.submitted_at.slice(0, 10) === dateFilter) : rows;
  const map = new Map<string, { name: string; mahallah: string; photoUrl: string; score: number; checkins: number }>();
  for (const r of filtered) {
    const { points } = computeScore(r.submitted_at, r.scheduled_start_time, r.program_count);
    const existing = map.get(r.user_id) || {
      name: r.student_name,
      mahallah: canonicalMahallah(r.mahallah),
      photoUrl: r.photo_url || "",
      score: 0,
      checkins: 0
    };
    existing.score += points;
    existing.checkins += 1;
    map.set(r.user_id, existing);
  }
  const entries: LeaderboardEntry[] = [];
  for (const [userId, data] of map) {
    entries.push({ rank: 0, userId, name: data.name, mahallah: data.mahallah, score: data.score, checkins: data.checkins, photoUrl: data.photoUrl });
  }
  entries.sort((a, b) => b.score - a.score);
  entries.forEach((e, i) => (e.rank = i + 1));
  return entries;
}

export function buildMahallahRanking(
  rows: LeaderboardRow[],
  totalRequiredSessions: number
): MahallahRanking[] {
  const studentMap = new Map<string, string>(); // user_id → mahallah
  const mahallahStudents = new Map<string, Set<string>>();
  const mahallahCheckins = new Map<string, number>();

  for (const r of rows) {
    const m = canonicalMahallah(r.mahallah) || "unknown";
    if (!mahallahStudents.has(m)) mahallahStudents.set(m, new Set());
    mahallahStudents.get(m)!.add(r.user_id);
    mahallahCheckins.set(m, (mahallahCheckins.get(m) || 0) + 1);
  }

  const rankings: MahallahRanking[] = [];
  for (const mh of allMahallahs) {
    const code = mh.code;
    const studentSet = mahallahStudents.get(code) || new Set();
    const studentCount = studentSet.size;
    const checkins = mahallahCheckins.get(code) || 0;
    const maxPossible = totalRequiredSessions * Math.max(studentCount, 1);
    const pct = maxPossible > 0 ? Math.round((checkins / maxPossible) * 100) : 0;

    rankings.push({
      rank: 0,
      mahallah: code,
      mahallahName: mh.name,
      avgScore: 0,
      totalCheckins: checkins,
      studentCount,
      attendancePct: pct
    });
  }
  rankings.sort((a, b) => b.attendancePct - a.attendancePct);
  rankings.forEach((r, i) => (r.rank = i + 1));
  return rankings;
}
