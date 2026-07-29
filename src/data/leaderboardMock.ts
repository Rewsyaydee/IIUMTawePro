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
    const studentCount = rand(5, 8);

    for (let s = 0; s < studentCount; s++) {
      const userId = `mu-${mh.code}-${s + 1}`;
      usedUserIds.add(userId);
      const name = pick(namePool);

      // Each student: 3-6 check-ins per day, 7 rolling days
      for (let day = 0; day < 7; day++) {
        const checkinsToday = rand(3, 6);
        const date = sessionDay(day);

        for (let c = 0; c < checkinsToday; c++) {
          const sessionHour = rand(8, 17);
          const sessionMin = pick([0, 0, 0, 30, 30]);
          const sessionStart = `${String(sessionHour).padStart(2, "0")}:${String(sessionMin).padStart(2, "0")}`;
          const [sh, sm] = [sessionHour, sessionMin];
          const startMin = sh * 60 + sm;

          const windows = [
            { delta: rand(5, 15),   window: "early_bird" as const, base: 150 },
            { delta: rand(-4, 4),   window: "on_time" as const,    base: 100 },
            { delta: rand(-14, -5), window: "late_grace" as const, base: 50 },
            { delta: rand(-30, -16), window: "standard" as const,  base: 10 }
          ];
          const chosen = pick(windows);
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
            arrivalWindow: chosen.window,
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
