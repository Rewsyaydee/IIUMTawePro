import type { LeaderboardEntry, LeaderboardScore, MahallahRanking } from "../types";
import { allMahallahs, type Mahallah } from "../features/navigation/data/mahallahs";

export function computeScore(
  submittedAt: string,
  sessionStart: string,
  programCount: number
): { points: number; basePoints: number; window: LeaderboardScore["arrivalWindow"] } {
  const submit = new Date(submittedAt);
  const [sh, sm] = sessionStart.split(":").map(Number);
  const start = new Date(submit);
  start.setHours(sh, sm, 0, 0);
  const diffMin = (start.getTime() - submit.getTime()) / 60000;

  let base: number;
  let window: LeaderboardScore["arrivalWindow"];

  if (diffMin >= 5 && diffMin <= 15)      { base = 150; window = "early_bird"; }
  else if (diffMin >= -5 && diffMin < 5)   { base = 100; window = "on_time"; }
  else if (diffMin >= -15 && diffMin < -5) { base = 50;  window = "late_grace"; }
  else                                      { base = 10;  window = "standard"; }

  return { points: base * programCount, basePoints: base, window };
}

export function getMahallahName(code: string): string {
  const m = allMahallahs.find((mh) => mh.code === code);
  return m ? m.name : code;
}

export function getMahallahShort(code: string): string {
  const m = allMahallahs.find((mh) => mh.code === code);
  return m ? m.short : code;
}

export function buildIndividualRanking(scores: LeaderboardScore[], userNames: Map<string, string>): LeaderboardEntry[] {
  const map = new Map<string, { score: number; checkins: number; mahallah: string }>();
  for (const s of scores) {
    const existing = map.get(s.userId) || { score: 0, checkins: 0, mahallah: s.mahallah };
    existing.score += s.points;
    existing.checkins += 1;
    map.set(s.userId, existing);
  }
  const entries: LeaderboardEntry[] = [];
  for (const [userId, data] of map) {
    entries.push({
      rank: 0,
      userId,
      name: userNames.get(userId) || userId.slice(0, 8),
      mahallah: data.mahallah,
      score: data.score,
      checkins: data.checkins
    });
  }
  entries.sort((a, b) => b.score - a.score);
  entries.forEach((e, i) => (e.rank = i + 1));
  return entries;
}

export function buildMahallahRanking(
  scores: LeaderboardScore[],
  mahallahStudentCounts: Map<string, number>,
  totalRequiredSessions: number
): MahallahRanking[] {
  const map = new Map<string, { totalScore: number; checkins: number }>();
  for (const s of scores) {
    const existing = map.get(s.mahallah) || { totalScore: 0, checkins: 0 };
    existing.totalScore += s.points;
    existing.checkins += 1;
    map.set(s.mahallah, existing);
  }
  const rankings: MahallahRanking[] = [];
  for (const [code, data] of map) {
    const studentCount = mahallahStudentCounts.get(code) || 1;
    const maxPossible = totalRequiredSessions * studentCount;
    const pct = maxPossible > 0 ? Math.round((data.checkins / maxPossible) * 100) : 0;
    rankings.push({
      rank: 0,
      mahallah: code,
      mahallahName: getMahallahName(code),
      avgScore: Math.round((data.totalScore / studentCount) * 10) / 10,
      totalCheckins: data.checkins,
      studentCount,
      attendancePct: pct
    });
  }
  rankings.sort((a, b) => b.attendancePct - a.attendancePct || b.avgScore - a.avgScore);
  rankings.forEach((r, i) => (r.rank = i + 1));
  return rankings;
}
