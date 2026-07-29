import { allMahallahs } from "../features/navigation/data/mahallahs";
import type { LeaderboardScore } from "../types";

const MALE_NAMES = ["Haziq", "Amir", "Fikri", "Danial", "Irfan", "Adam", "Zikri", "Afiq", "Haris", "Imran", "Luqman", "Nabil", "Syafiq", "Aiman", "Farid", "Hakim"];
const FEMALE_NAMES = ["Aisyah", "Nadia", "Farah", "Sofia", "Amirah", "Alya", "Batrisyia", "Zahra", "Husna", "Maryam", "Aina", "Hana", "Sara", "Nurin", "Alia", "Syasya"];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeId() {
  return `mu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sessionDay(dateOffset: number) {
  const d = new Date();
  d.setDate(d.getDate() - dateOffset);
  return d.toISOString().slice(0, 10);
}

export function generateMockScores(): LeaderboardScore[] {
  const scores: LeaderboardScore[] = [];
  const usedUserIds = new Set<string>();

  for (const mh of allMahallahs) {
    const isMale = mh.zone === "male";
    const namePool = isMale ? MALE_NAMES : FEMALE_NAMES;

    // Fixed podium: Ali #1, Bilal #2, Uthman #3
    const podiumRank = { "mh-ali": 1, "mh-bilal": 2, "mh-uthman": 3 }[mh.code];
    const studentCount = podiumRank ? 8 : rand(5, 8);
    const checkinBoost = podiumRank ? 7 : rand(3, 6);
    const qualityBoost = podiumRank
      ? [0.5, 0.3, 0.15, 0.05] // Ali: 50% early_bird
      : [0.25, 0.35, 0.25, 0.15]; // others: random

    for (let s = 0; s < studentCount; s++) {
      const userId = `mu-${mh.code}-${s + 1}`;
      usedUserIds.add(userId);
      const name = pick(namePool);

      // Each student: N check-ins per day, 7 rolling days
      for (let day = 0; day < 7; day++) {
        const checkinsToday = podiumRank ? checkinBoost : rand(3, 6);
        const date = sessionDay(day);

        for (let c = 0; c < checkinsToday; c++) {
          const sessionHour = rand(8, 17);
          const sessionMin = pick([0, 0, 0, 30, 30]);
          const sessionStart = `${String(sessionHour).padStart(2, "0")}:${String(sessionMin).padStart(2, "0")}`;
          const [sh, sm] = [sessionHour, sessionMin];
          const startMin = sh * 60 + sm;

          const r = Math.random();
          const boost = podiumRank
            ? (r < qualityBoost[0] ? "early_bird" : r < qualityBoost[0] + qualityBoost[1] ? "on_time" : r < qualityBoost[0] + qualityBoost[1] + qualityBoost[2] ? "late_grace" : "standard")
            : pick(["early_bird", "early_bird", "on_time", "on_time", "on_time", "late_grace", "late_grace", "standard"] as const);
          const baseMap = { early_bird: { delta: rand(5, 15), base: 150 }, on_time: { delta: rand(-4, 4), base: 100 }, late_grace: { delta: rand(-14, -5), base: 50 }, standard: { delta: rand(-30, -16), base: 10 } };
          const chosen = baseMap[boost];
          const submitMin = startMin - chosen.delta;
          const submitHour = Math.floor(submitMin / 60);
          const submitM = submitMin % 60;
          if (submitM < 0) continue;

          const submittedAt = `${date}T${String(submitHour).padStart(2, "0")}:${String(submitM).padStart(2, "0")}:00.000Z`;
          const programCount = rand(1, 4);

          scores.push({
            id: makeId(),
            userId,
            mahallah: mh.code,
            scheduleItemId: `mock-session-${day}-${c}`,
            scoreDate: date,
            points: chosen.base * programCount,
            basePoints: chosen.base,
            programCount,
            arrivalWindow: boost,
            submittedAt
          });
        }
      }
    }
  }

  return scores;
}

export function getMockUserNames(): Map<string, { name: string; mahallah: string }> {
  const map = new Map<string, { name: string; mahallah: string }>();
  for (const mh of allMahallahs) {
    const isMale = mh.zone === "male";
    const namePool = isMale ? MALE_NAMES : FEMALE_NAMES;
    for (let s = 0; s < rand(5, 8); s++) {
      const userId = `mu-${mh.code}-${s + 1}`;
      map.set(userId, { name: pick(namePool), mahallah: mh.code });
    }
  }
  return map;
}
