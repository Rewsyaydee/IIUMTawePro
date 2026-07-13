import type { Bureau, ScheduleItem, SessionBlock } from "../types";

type ScheduleTuple = [
  date: string,
  day: string,
  week: ScheduleItem["week"],
  start: string,
  end: string,
  title: string,
  venue: string,
  tag: string,
  audience: ScheduleItem["audience"],
  bureau: Bureau,
  description: string,
  venueCode: string,
  isAttendanceRequired?: boolean,
  block?: SessionBlock,
  blockGroup?: string,
  isConcurrent?: boolean,
  track?: string
];

const rawSchedule: ScheduleTuple[] = [
  // ── PREPARATION WEEK ──
  ["2026-07-08", "Wednesday", "preparation", "09:00", "16:00", "International Student Registration", "Main Hall, ICC", "Registration", "All", "Registration", "Monday, 8 July 2026 - Thursday, 11 July 2026", "icc-main-hall"],
  ["2026-07-08", "Wednesday", "preparation", "09:00", "16:30", "Medical Check-up for International Students", "IIUM Sejahtera Clinic", "Programme", "All", "Welfare", "Monday, 8 July 2026 - Thursday, 11 July 2026", "sejahtera-clinic"],
  ["2026-07-10", "Friday", "preparation", "09:00", "16:00", "Mahallah Registration for Former-CFS", "Respective Mahallah", "Registration", "All", "Registration", "Friday, 10 July 2026", "mahallah-zone"],
  ["2026-07-10", "Friday", "preparation", "09:00", "12:00", "Registration for Direct Intake", "Respective Mahallah", "Registration", "All", "Registration", "Friday, 10 July 2026", "mahallah-zone"],
  ["2026-07-10", "Friday", "preparation", "09:00", "11:00", "Medical Check-up for International Students", "IIUM Sejahtera Clinic", "Programme", "All", "Welfare", "Friday, 10 July 2026", "sejahtera-clinic"],
  ["2026-07-10", "Friday", "preparation", "11:00", "12:30", "Briefing for International Students", "Mini Auditorium", "Briefing", "All", "Program Coordinator", "Friday, 10 July 2026", "mini-auditorium"],
  ["2026-07-10", "Friday", "preparation", "14:30", "16:00", "Briefing by CELPAD", "Main Auditorium", "Briefing", "All", "Program Coordinator", "Friday, 10 July 2026", "main-auditorium"],
  ["2026-07-10", "Friday", "preparation", "16:00", "17:00", "Briefing by CCC on FKT", "Main Auditorium", "Briefing", "All", "Program Coordinator", "Friday, 10 July 2026", "main-auditorium"],
  ["2026-07-12", "Saturday", "preparation", "09:00", "22:00", "Self-Management & Settling In", "TBC", "Programme", "All", "Program Coordinator", "Saturday, 12 July 2026 - Monday, 13 July 2026", "tbc"],

  // ── EVENT WEEK: Day 0 — Monday, 13 July 2026 ──
  ["2026-07-13", "Monday", "event_week", "09:00", "10:00", "Video Presentation with relevant KCDIO: STADD", "Main Auditorium", "Programme", "All", "Multimedia", "Day 0: Monday, 13 July 2026", "main-auditorium", false, "before_break", "2026-07-13"],
  ["2026-07-13", "Monday", "event_week", "10:30", "12:00", "Welcoming Session with Prof. Dato' Dr. Mohamad Fauzan Noordin", "Main Auditorium", "Programme", "All", "Program Coordinator", "Day 0: Monday, 13 July 2026", "main-auditorium", true, "before_break", "2026-07-13"],
  ["2026-07-13", "Monday", "event_week", "12:00", "13:00", "Briefing on Ta'aruf Week", "Main Auditorium", "Briefing", "All", "Program Coordinator", "Day 0: Monday, 13 July 2026", "main-auditorium", false, "before_break", "2026-07-13"],
  ["2026-07-13", "Monday", "event_week", "14:00", "15:00", "Murabbi Session", "IIUM SHAS Mosque", "Programme", "All", "Program Coordinator", "Day 0: Monday, 13 July 2026", "shas-mosque", true, "after_break", "2026-07-13"],

  // ── EVENT WEEK: Day 1 — Tuesday, 14 July 2026 ──
  ["2026-07-14", "Tuesday", "event_week", "08:30", "10:00", "My IIUM", "Main Auditorium", "Programme", "All", "Program Coordinator", "Day 1: Tuesday, 14 July 2026", "main-auditorium", true, "before_break", "2026-07-14"],
  ["2026-07-14", "Tuesday", "event_week", "09:00", "12:00", "EPT (Former CFS)", "ICC", "Placement Test", "All", "Program Coordinator", "Day 1: Tuesday, 14 July 2026", "icc-main-hall", false, "before_break", "2026-07-14", false, "Former CFS"],
  ["2026-07-14", "Tuesday", "event_week", "09:45", "12:45", "Tadarus Al-Quran (Former CFS)", "Main Hall, IIUM SHAS Mosque", "Programme", "All", "Discipline", "Day 1: Tuesday, 14 July 2026", "shas-mosque", false, "before_break", "2026-07-14", false, "Former CFS"],
  ["2026-07-14", "Tuesday", "event_week", "12:00", "13:00", "Far'dhu Ain Test (Non-Former CFS)", "ICC", "Placement Test", "All", "Program Coordinator", "Day 1: Tuesday, 14 July 2026", "icc-main-hall", false, "before_break", "2026-07-14", false, "Non-Former CFS"],
  ["2026-07-14", "Tuesday", "event_week", "14:00", "15:00", "Murabbi Session", "IIUM SHAS Mosque", "Programme", "All", "Program Coordinator", "Day 1: Tuesday, 14 July 2026", "shas-mosque", true, "after_break", "2026-07-14"],
  ["2026-07-14", "Tuesday", "event_week", "14:30", "17:00", "APT (Non-Former CFS)", "ICC", "Placement Test", "All", "Program Coordinator", "Day 1: Tuesday, 14 July 2026", "icc-main-hall", false, "after_break", "2026-07-14", false, "Non-Former CFS"],
  ["2026-07-14", "Tuesday", "event_week", "22:00", "23:00", "My Mahallah My Second Home", "Respective Mahallah", "Programme", "All", "Discipline", "Day 1: Tuesday, 14 July 2026", "mahallah-zone", true, "after_break", "2026-07-14"],

  // ── EVENT WEEK: Day 2 — Wednesday, 15 July 2026 ──
  ["2026-07-15", "Wednesday", "event_week", "08:30", "17:00", "Opening of ASNB Account", "Main Auditorium", "Programme", "All", "Program Coordinator", "Day 2: Wednesday, 15 July 2026", "main-auditorium", false, "concurrent", "2026-07-15", true],
  ["2026-07-15", "Wednesday", "event_week", "08:30", "09:15", "Video Presentation with relevant KCDIO: AMAD", "Main Auditorium", "Programme", "All", "Multimedia", "Day 2: Wednesday, 15 July 2026", "main-auditorium", false, "before_break", "2026-07-15"],
  ["2026-07-15", "Wednesday", "event_week", "09:15", "10:00", "Video Presentation with relevant KCDIO: CCC", "Main Auditorium", "Programme", "All", "Multimedia", "Day 2: Wednesday, 15 July 2026", "main-auditorium", false, "before_break", "2026-07-15"],
  ["2026-07-15", "Wednesday", "event_week", "10:00", "10:45", "Video Presentation with relevant KCDIO: FINANCE", "Main Auditorium", "Programme", "All", "Multimedia", "Day 2: Wednesday, 15 July 2026", "main-auditorium", false, "before_break", "2026-07-15"],
  ["2026-07-15", "Wednesday", "event_week", "10:45", "11:30", "Video Presentation with relevant KCDIO: OSEM", "Main Auditorium", "Programme", "All", "Multimedia", "Day 2: Wednesday, 15 July 2026", "main-auditorium", false, "before_break", "2026-07-15"],
  ["2026-07-15", "Wednesday", "event_week", "11:30", "12:15", "Video Presentation with relevant KCDIO: RSD", "Main Auditorium", "Programme", "All", "Multimedia", "Day 2: Wednesday, 15 July 2026", "main-auditorium", true, "before_break", "2026-07-15"],
  ["2026-07-15", "Wednesday", "event_week", "14:00", "14:30", "Session on Financial Literacy with ASNB", "Main Auditorium", "Programme", "All", "Program Coordinator", "Day 2: Wednesday, 15 July 2026", "main-auditorium", false, "after_break", "2026-07-15"],
  ["2026-07-15", "Wednesday", "event_week", "14:30", "16:30", "Session with Counselling and Career Services Centre", "Main Auditorium", "Programme", "All", "Welfare", "Day 2: Wednesday, 15 July 2026", "main-auditorium", true, "after_break", "2026-07-15"],
  ["2026-07-15", "Wednesday", "event_week", "20:00", "22:00", "Self-Management & Maghrib & Isya' Congregational Prayer", "TBC", "Prayer", "All", "Discipline", "Day 2: Wednesday, 15 July 2026", "tbc", false, "after_break", "2026-07-15"],
  ["2026-07-15", "Wednesday", "event_week", "22:00", "23:00", "Mahallah Activities", "Respective Mahallah", "Programme", "All", "Discipline", "Day 2: Wednesday, 15 July 2026", "mahallah-zone", false, "after_break", "2026-07-15"],

  // ── EVENT WEEK: Day 3 — Thursday, 16 July 2026 ──
  ["2026-07-16", "Thursday", "event_week", "08:30", "09:15", "Video Presentation with relevant KCDIO: OSHBE", "Main Auditorium", "Programme", "All", "Multimedia", "Day 3: Thursday, 16 July 2026", "main-auditorium", false, "before_break", "2026-07-16"],
  ["2026-07-16", "Thursday", "event_week", "09:15", "10:00", "Video Presentation with relevant KCDIO: EDC", "Main Auditorium", "Programme", "All", "Multimedia", "Day 3: Thursday, 16 July 2026", "main-auditorium", false, "before_break", "2026-07-16"],
  ["2026-07-16", "Thursday", "event_week", "10:00", "10:45", "Video Presentation with relevant KCDIO: ISC", "Main Auditorium", "Programme", "All", "Multimedia", "Day 3: Thursday, 16 July 2026", "main-auditorium", false, "before_break", "2026-07-16"],
  ["2026-07-16", "Thursday", "event_week", "10:45", "11:30", "Video Presentation with relevant KCDIO: SDC", "Main Auditorium", "Programme", "All", "Multimedia", "Day 3: Thursday, 16 July 2026", "main-auditorium", false, "before_break", "2026-07-16"],
  ["2026-07-16", "Thursday", "event_week", "11:30", "12:30", "Session with DSU", "Main Auditorium", "Programme", "All", "Program Coordinator", "Day 3: Thursday, 16 July 2026", "main-auditorium", true, "before_break", "2026-07-16"],
  ["2026-07-16", "Thursday", "event_week", "14:30", "17:00", "Ihsan Madani Session", "Respective Kulliyyah", "Programme", "All", "Program Coordinator", "Day 3: Thursday, 16 July 2026", "kulliyyah-zone", true, "after_break", "2026-07-16"],

  // ── EVENT WEEK: Day 4 — Friday, 17 July 2026 (no blocks) ──
  ["2026-07-17", "Friday", "event_week", "08:30", "09:15", "Video Presentation with relevant KCDIO: OSHBE", "Main Auditorium", "Programme", "All", "Multimedia", "Day 4: Friday, 17 July 2026", "main-auditorium"],
  ["2026-07-17", "Friday", "event_week", "08:30", "14:00", "Ihsan Madani Session", "ADM LT1", "Programme", "All", "Program Coordinator", "Day 4: Friday, 17 July 2026", "adm-lt1"],
  ["2026-07-17", "Friday", "event_week", "09:00", "12:30", "Ihsan Madani Session", "Respective Kulliyyah", "Programme", "All", "Program Coordinator", "Day 4: Friday, 17 July 2026", "kulliyyah-zone"],
  ["2026-07-17", "Friday", "event_week", "12:30", "14:30", "Break, Zohor Prayer & Self-Management", "TBC", "Prayer", "All", "Discipline", "Day 4: Friday, 17 July 2026", "tbc"],
  ["2026-07-17", "Friday", "event_week", "14:30", "17:00", "Ihsan Madani Session", "Respective Kulliyyah", "Programme", "All", "Program Coordinator", "Day 4: Friday, 17 July 2026", "kulliyyah-zone", true],
  ["2026-07-17", "Friday", "event_week", "20:00", "22:00", "Self-Management & Maghrib & Isya' Congregational Prayer", "TBC", "Prayer", "All", "Discipline", "Day 4: Friday, 17 July 2026", "tbc"],

  // ── EVENT WEEK: Day 5 — Saturday, 18 July 2026 (no blocks) ──
  ["2026-07-18", "Saturday", "event_week", "08:30", "10:00", "Usrah at Mahallah", "Main Auditorium", "Programme", "All", "Discipline", "Day 5: Saturday, 18 July 2026", "main-auditorium"],
  ["2026-07-18", "Saturday", "event_week", "08:30", "11:30", "Tilawah Proficiency Test", "Online", "Placement Test", "All", "Program Coordinator", "Day 5: Saturday, 18 July 2026", "online"],
  ["2026-07-18", "Saturday", "event_week", "10:00", "10:30", "Session with Student Union", "Main Auditorium", "Programme", "All", "Program Coordinator", "Day 5: Saturday, 18 July 2026", "main-auditorium"],
  ["2026-07-18", "Saturday", "event_week", "10:30", "12:00", "Bai'ah Rehearsal", "Main Auditorium", "Programme", "All", "Discipline", "Day 5: Saturday, 18 July 2026", "main-auditorium"],
  ["2026-07-18", "Saturday", "event_week", "12:00", "14:30", "Friday Prayer Break & Self-Management", "TBC", "Prayer", "All", "Discipline", "Day 5: Saturday, 18 July 2026", "tbc"],
  ["2026-07-18", "Saturday", "event_week", "14:30", "16:30", "Bai'ah Ceremony", "Main Auditorium", "Programme", "All", "Discipline", "Day 5: Saturday, 18 July 2026", "main-auditorium"],

  // ── EVENT WEEK: Sunday, 19 July 2026 ──
  ["2026-07-19", "Sunday", "event_week", "09:30", "10:30", "Bus to Pagoh and Kuantan Campus", "TBC", "Departure", "Students", "Special Task", "Sunday, 19 July 2026", "bus-stop"]
];

export const realEventSchedule: ScheduleItem[] = rawSchedule.map(
  ([date, day, week, scheduledStartTime, scheduledEndTime, title, venue, tag, audience, responsibleBureau, description, venueCode, isAttendanceRequired, block, blockGroup, isConcurrent, track], index) => ({
    id: `real-s-${String(index + 1).padStart(3, "0")}`,
    date,
    day,
    week,
    scheduledStartTime,
    scheduledEndTime,
    title,
    venue,
    tag,
    audience,
    description,
    isLive: false,
    notifyMinutesBefore: tag === "Departure" ? 60 : 30,
    responsibleBureau,
    preSessionTasks: [],
    readinessStatus: "ready",
    venueCode,
    isAttendanceRequired: isAttendanceRequired || false,
    block,
    blockGroup,
    isConcurrent: isConcurrent || false,
    track
  })
);

export type SessionBlockInfo = {
  id: string;
  date: string;
  day: string;
  block: SessionBlock;
  blockLabel: string;
  timeRange: string;
  items: ScheduleItem[];
  isAttendanceRequired: boolean;
};

export function getSessionBlocks(schedule: ScheduleItem[]): SessionBlockInfo[] {
  const blockMap = new Map<string, SessionBlockInfo>();

  for (const item of schedule) {
    if (!item.block || !item.blockGroup) continue;
    if (item.isConcurrent) continue;

    const blockId = `block-${item.blockGroup}-${item.block}`;
    if (!blockMap.has(blockId)) {
      const isBefore = item.block === "before_break";
      const blockItems = schedule.filter(
        (s) => s.blockGroup === item.blockGroup && s.block === item.block && !s.isConcurrent
      );
      const starts = blockItems.map((s) => s.scheduledStartTime).sort();
      const ends = blockItems.map((s) => s.scheduledEndTime).sort();
      const hasRequired = blockItems.some((s) => s.isAttendanceRequired);

      blockMap.set(blockId, {
        id: blockId,
        date: item.date,
        day: item.day,
        block: item.block,
        blockLabel: `${item.day} - ${isBefore ? "Before Break" : "After Break"}`,
        timeRange: `${starts[0]} - ${ends[ends.length - 1]}`,
        items: blockItems,
        isAttendanceRequired: hasRequired
      });
    }
  }

  return Array.from(blockMap.values()).sort((a, b) =>
    `${a.date}${a.block}`.localeCompare(`${b.date}${b.block}`)
  );
}

export function getConcurrentEvents(schedule: ScheduleItem[]): ScheduleItem[] {
  return schedule.filter((s) => s.isConcurrent);
}

export function getRequiredBlockCount(schedule: ScheduleItem[]): number {
  return getSessionBlocks(schedule).filter((b) => b.isAttendanceRequired).length;
}
