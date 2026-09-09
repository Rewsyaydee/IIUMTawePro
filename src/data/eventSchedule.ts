import type { Bureau, ScheduleItem, SessionBlock } from "../types";
import { buildBlockId } from "../lib/scheduleTime";

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
  // ── PREPARATION: REAL programme 10-20 Sep 2026 (REAL TAWE SCHEDULE.md) ──
  ["2026-09-10", "Thursday", "preparation", "09:00", "13:00", "Mahallah Registration (International Students)", "Wadi Budi", "Registration", "All", "Registration", "For international students.", ""],
  ["2026-09-11", "Friday", "preparation", "09:00", "13:00", "Special Programme for International Student", "Experimental Hall", "Programme", "All", "Program Coordinator", "", ""],
  ["2026-09-15", "Tuesday", "preparation", "09:00", "13:00", "Medical Checkup for International Students", "TBD", "Programme", "All", "Welfare", "Priority to International students of Pagoh and Kuantan Campus. Venue = TBD", "tbc"],
  ["2026-09-15", "Tuesday", "preparation", "13:00", "14:00", "Break for Lunch and Zuhr", "Around Campus", "Break", "All", "Program Coordinator", "", ""],
  ["2026-09-15", "Tuesday", "preparation", "14:00", "17:00", "Medical Checkup for International Students", "TBD", "Programme", "All", "Welfare", "Priority to International students of Pagoh and Kuantan Campus. Venue = TBD", "tbc"],
  ["2026-09-17", "Thursday", "preparation", "09:00", "13:00", "Medical Checkup for International Students", "TBD", "Programme", "All", "Welfare", "Priority to International students of Pagoh and Kuantan Campus. Venue = TBD", "tbc"],
  ["2026-09-17", "Thursday", "preparation", "13:00", "14:30", "Break for Lunch and Zuhr", "Around Campus", "Break", "All", "Program Coordinator", "", ""],
  ["2026-09-17", "Thursday", "preparation", "14:30", "15:30", "Bus to Pagoh and Kuantan Campus", "Bus Stop", "Departure", "Students", "Special Task", "14:30 at bus stop. For direct intake International Students only.", "bus-stop"],
  ["2026-09-18", "Friday", "preparation", "09:00", "13:00", "Mahallah Registration (Non-Former CFS students)", "Respective Mahallah", "Registration", "All", "Registration", "Direct Intake - UPU/Malaysian.", "mahallah-zone"],
  ["2026-09-18", "Friday", "preparation", "13:00", "14:45", "Break for Lunch and Zuhr", "Around Campus", "Break", "All", "Program Coordinator", "", ""],
  ["2026-09-18", "Friday", "preparation", "14:45", "16:30", "Briefing by CELPAD - On EPT, APT", "Online", "Briefing", "All", "Program Coordinator", "Broadcast.", "online"],
  ["2026-09-18", "Friday", "preparation", "16:30", "17:00", "Briefing by CCC on Fardhu Ain Test (FAT)", "Online", "Briefing", "All", "Program Coordinator", "Broadcast.", "online"],
  ["2026-09-19", "Saturday", "preparation", "09:00", "13:00", "Mahallah Registration for Former-CFS", "Respective Mahallah", "Registration", "All", "Registration", "List of Mahallahs: Aminah, Ruqayyah, Maryam, Asma, Sumayyah, Faruq, Bilal and Ali.", "mahallah-zone"],
  ["2026-09-19", "Saturday", "preparation", "13:00", "14:00", "Break for Lunch and Zuhr", "Around Campus", "Break", "All", "Program Coordinator", "", ""],
  ["2026-09-19", "Saturday", "preparation", "14:00", "16:00", "Mahallah Registration for Former-CFS", "Respective Mahallah", "Registration", "All", "Registration", "List of Mahallahs: Aminah, Ruqayyah, Maryam, Asma, Sumayyah, Faruq, Bilal and Ali.", "mahallah-zone"],
  ["2026-09-19", "Saturday", "preparation", "08:30", "12:00", "English Proficiency Test (EPT)", "TBD", "Placement Test", "Students", "Program Coordinator", "KAED & KOE. Non-Former CFS students.", "tbc", false, undefined, undefined, true, "KAED & KOE"],
  ["2026-09-19", "Saturday", "preparation", "12:00", "13:00", "Fardhu Ain Test (FAT)", "TBD", "Placement Test", "Students", "Program Coordinator", "KAED & KOE. For International Students only.", "tbc", false, undefined, undefined, true, "KAED & KOE"],
  ["2026-09-19", "Saturday", "preparation", "14:30", "17:00", "Arabic Proficiency Test (APT)", "TBD", "Placement Test", "Students", "Program Coordinator", "KAED & KOE. Non-Former CFS students.", "tbc", false, undefined, undefined, true, "KAED & KOE"],
  ["2026-09-20", "Sunday", "preparation", "09:00", "13:00", "Mahallah Registration - Former CFS", "Respective Mahallah", "Registration", "All", "Registration", "List of Mahallahs: Asiah, Halimah, Hafsah, Nusaibah, Safiyyah, Salahuddin, Uthman, Siddiq and Zubair.", "mahallah-zone"],
  ["2026-09-20", "Sunday", "preparation", "13:00", "14:00", "Break for Lunch and Zuhr", "Around Campus", "Break", "All", "Program Coordinator", "", ""],
  ["2026-09-20", "Sunday", "preparation", "14:00", "16:00", "Mahallah Registration - Former CFS", "Respective Mahallah", "Registration", "All", "Registration", "List of Mahallahs: Asiah, Halimah, Hafsah, Nusaibah, Safiyyah, Salahuddin, Uthman, Siddiq and Zubair.", "mahallah-zone"],
  ["2026-09-20", "Sunday", "preparation", "17:00", "20:00", "Maghrib & Isya' Congregational Prayer", "Respective Mahallah", "Prayer", "All", "Program Coordinator", "", "mahallah-zone"],
  ["2026-09-20", "Sunday", "preparation", "20:00", "21:00", "My Mahallah My Second Home", "Respective Mahallah", "Programme", "All", "Discipline", "", "mahallah-zone"],
  ["2026-09-20", "Sunday", "preparation", "08:30", "12:00", "English Proficiency Test (EPT) (SPEAKING)", "TBD", "Placement Test", "Students", "Program Coordinator", "KAED & KOE. Non-Former CFS students.", "tbc", false, undefined, undefined, true, "KAED & KOE"],
  ["2026-09-20", "Sunday", "preparation", "14:30", "17:00", "English Proficiency Test (EPT) (SPEAKING)", "TBD", "Placement Test", "Students", "Program Coordinator", "KAED & KOE. Non-Former CFS students.", "tbc", false, undefined, undefined, true, "KAED & KOE"],

  // ── EVENT WEEK: Monday, 21 September 2026 ──
  ["2026-09-21", "Monday", "event_week", "08:30", "09:30", "Briefing from STADD", "Main Prayer Hall, SHAS Mosque", "Programme", "All", "Program Coordinator", "", "shas-mosque", false, "before_break", "2026-09-21"],
  ["2026-09-21", "Monday", "event_week", "09:30", "10:30", "Welcoming Session with Prof. Dato' Dr. Mohamad Fauzan Noordin (Deputy Rector Student Development and Community Engagement)", "Main Prayer Hall, SHAS Mosque", "Programme", "All", "Program Coordinator", "(MY IIUM). Broadcast.", "shas-mosque", true, "before_break", "2026-09-21"],
  ["2026-09-21", "Monday", "event_week", "10:30", "11:00", "Briefing on Ta'aruf Week", "Main Prayer Hall, SHAS Mosque", "Briefing", "All", "Program Coordinator", "", "shas-mosque", false, "before_break", "2026-09-21"],
  ["2026-09-21", "Monday", "event_week", "11:00", "12:00", "Forum Session with KCDIO AMAD & CCC", "Main Prayer Hall, SHAS Mosque", "Programme", "All", "Program Coordinator", "", "shas-mosque", false, "before_break", "2026-09-21"],
  ["2026-09-21", "Monday", "event_week", "12:00", "12:45", "Forum Session with KCDIO FINANCE Division & IIUM Endowment Fund", "Main Prayer Hall, SHAS Mosque", "Programme", "All", "Program Coordinator", "", "shas-mosque", false, "before_break", "2026-09-21"],
  ["2026-09-21", "Monday", "event_week", "12:45", "14:00", "Break for Lunch and Zuhr", "Around Campus", "Break", "All", "Program Coordinator", "", ""],
  ["2026-09-21", "Monday", "event_week", "14:00", "15:15", "Forum Session with KCDIO OLA, OSHBE, & OSEM", "Main Prayer Hall, SHAS Mosque", "Programme", "All", "Program Coordinator", "", "shas-mosque", true, "after_break", "2026-09-21"],
  ["2026-09-21", "Monday", "event_week", "15:15", "16:15", "Forum Session with KCDIO RSD & ITD", "Main Prayer Hall, SHAS Mosque", "Programme", "All", "Program Coordinator", "", "shas-mosque", false, "after_break", "2026-09-21"],
  ["2026-09-21", "Monday", "event_week", "16:15", "17:00", "Asr Congregational Prayer", "Respective Mahallah", "Prayer", "All", "Program Coordinator", "", "mahallah-zone"],
  ["2026-09-21", "Monday", "event_week", "17:00", "18:00", "Murabbi Session", "IIUM SHAS Mosque", "Programme", "All", "Program Coordinator", "", "shas-mosque", false, "after_break", "2026-09-21"],
  ["2026-09-21", "Monday", "event_week", "18:00", "20:00", "Maghrib & Isya' Congregational Prayer", "Respective Mahallah", "Prayer", "All", "Program Coordinator", "", "mahallah-zone"],
  ["2026-09-21", "Monday", "event_week", "08:30", "17:00", "Booth Exhibition and Activation of RHB Card, ASNB Account & Note Book LM", "Foyer, SHAS Mosque", "Exhibition", "All", "Program Coordinator", "", "", false, undefined, undefined, true],

  // ── EVENT WEEK: Tuesday, 22 September 2026 ──
  ["2026-09-22", "Tuesday", "event_week", "08:30", "09:15", "Session with Leaders Prime Minister Office", "Main Prayer Hall, SHAS Mosque", "Programme", "All", "Program Coordinator", "", "shas-mosque", true, "before_break", "2026-09-22"],
  ["2026-09-22", "Tuesday", "event_week", "09:15", "10:00", "KPT SLOT Akademi Kenegaraan Malaysia MADANI", "Main Prayer Hall, SHAS Mosque", "Programme", "All", "Program Coordinator", "Broadcast.", "shas-mosque", false, "before_break", "2026-09-22"],
  ["2026-09-22", "Tuesday", "event_week", "10:00", "10:45", "KPT SLOT Literasi Undi 18", "Main Prayer Hall, SHAS Mosque", "Programme", "All", "Program Coordinator", "Broadcast.", "shas-mosque", false, "before_break", "2026-09-22"],
  ["2026-09-22", "Tuesday", "event_week", "10:45", "11:45", "Forum Session with KCDIO DSU & STADD Welfare Unit", "Main Prayer Hall, SHAS Mosque", "Programme", "All", "Program Coordinator", "", "shas-mosque", false, "before_break", "2026-09-22"],
  ["2026-09-22", "Tuesday", "event_week", "11:45", "12:45", "Forum Session with CCSC & ISC", "Main Prayer Hall, SHAS Mosque", "Programme", "All", "Program Coordinator", "", "shas-mosque", false, "before_break", "2026-09-22"],
  ["2026-09-22", "Tuesday", "event_week", "12:45", "14:30", "Break for Lunch and Zuhr", "Around Campus", "Break", "All", "Program Coordinator", "", ""],
  ["2026-09-22", "Tuesday", "event_week", "14:30", "15:15", "KPT SLOT Slot Literasi Artificial Intelligence", "Main Prayer Hall, SHAS Mosque", "Programme", "All", "Program Coordinator", "Broadcast.", "shas-mosque", true, "after_break", "2026-09-22"],
  ["2026-09-22", "Tuesday", "event_week", "15:15", "16:00", "KPT SLOT Literasi Kewangan by ASNB", "Main Prayer Hall, SHAS Mosque", "Programme", "All", "Program Coordinator", "Broadcast.", "shas-mosque", false, "after_break", "2026-09-22"],
  ["2026-09-22", "Tuesday", "event_week", "16:00", "17:00", "Break for Asr' Congregational Prayer", "Main Prayer Hall, SHAS Mosque", "Prayer", "All", "Program Coordinator", "Broadcast.", "shas-mosque"],
  ["2026-09-22", "Tuesday", "event_week", "17:00", "17:30", "Forum Session with Student Union, Mahallah Representative and Kulliyyah Based Society", "Main Prayer Hall, SHAS Mosque", "Programme", "All", "Program Coordinator", "Broadcast.", "shas-mosque", false, "after_break", "2026-09-22"],
  ["2026-09-22", "Tuesday", "event_week", "08:30", "17:00", "Booth Exhibition and Activation of RHB Card, ASNB Account & Note Book LM", "Foyer, SHAS Mosque", "Exhibition", "All", "Program Coordinator", "", "", false, undefined, undefined, true],

  // ── EVENT WEEK: Wednesday, 23 September 2026 ──
  ["2026-09-23", "Wednesday", "event_week", "09:00", "12:30", "Insan Madani Session", "Respective Kulliyyah", "Programme", "All", "Program Coordinator", "", "kulliyyah-zone", true, "before_break", "2026-09-23"],
  ["2026-09-23", "Wednesday", "event_week", "12:30", "14:30", "Break for Lunch and Zuhr", "Around Campus", "Break", "All", "Program Coordinator", "", ""],
  ["2026-09-23", "Wednesday", "event_week", "14:30", "17:00", "Insan Madani Session", "Respective Kulliyyah", "Programme", "All", "Program Coordinator", "", "kulliyyah-zone", true, "after_break", "2026-09-23"],
  ["2026-09-23", "Wednesday", "event_week", "17:00", "21:00", "Break for Asr' Congregational Prayer", "Main Prayer Hall, SHAS Mosque", "Prayer", "All", "Program Coordinator", "Broadcast.", "shas-mosque"],
  ["2026-09-23", "Wednesday", "event_week", "21:00", "22:00", "Syarahan Madani Abad ke-21", "Main Prayer Hall, SHAS Mosque", "Programme", "All", "Program Coordinator", "", "shas-mosque"],
  ["2026-09-23", "Wednesday", "event_week", "08:30", "17:00", "Booth Exhibition and Activation of RHB Card, ASNB Account & Note Book LM", "Foyer, SHAS Mosque", "Exhibition", "All", "Program Coordinator", "", "", false, undefined, undefined, true],

  // ── EVENT WEEK: Thursday, 24 September 2026 ──
  ["2026-09-24", "Thursday", "event_week", "09:00", "12:30", "Insan Madani Session", "Respective Kulliyyah", "Programme", "All", "Program Coordinator", "", "kulliyyah-zone", true, "before_break", "2026-09-24"],
  ["2026-09-24", "Thursday", "event_week", "12:30", "14:30", "Break for Lunch and Zuhr", "Around Campus", "Break", "All", "Program Coordinator", "", ""],
  ["2026-09-24", "Thursday", "event_week", "14:30", "17:00", "Insan Madani Session", "Respective Kulliyyah", "Programme", "All", "Program Coordinator", "", "kulliyyah-zone", true, "after_break", "2026-09-24"],
  ["2026-09-24", "Thursday", "event_week", "08:30", "17:00", "Booth Exhibition and Activation of RHB Card, ASNB Account & Note Book LM", "Foyer, SHAS Mosque", "Exhibition", "All", "Program Coordinator", "", "", false, undefined, undefined, true],

  // ── EVENT WEEK: Friday, 25 September 2026 ──
  ["2026-09-25", "Friday", "event_week", "08:30", "09:30", "KPT SLOT Cakna Pertahanan (MINDEF)", "Main Prayer Hall, SHAS Mosque", "Programme", "All", "Program Coordinator", "Broadcast.", "shas-mosque", true, "before_break", "2026-09-25"],
  ["2026-09-25", "Friday", "event_week", "08:30", "09:30", "KPT SLOT MySiswa Place (YPS)", "Main Prayer Hall, SHAS Mosque", "Programme", "All", "Program Coordinator", "Broadcast.", "shas-mosque", false, "before_break", "2026-09-25"],
  ["2026-09-25", "Friday", "event_week", "11:00", "11:45", "Bai'ah Rehearsal", "Main Prayer Hall, SHAS Mosque", "Programme", "All", "Discipline", "Broadcast.", "shas-mosque", false, "before_break", "2026-09-25"],
  ["2026-09-25", "Friday", "event_week", "11:45", "15:00", "Break for Lunch and Zuhr", "Around Campus", "Break", "All", "Program Coordinator", "", ""],
  ["2026-09-25", "Friday", "event_week", "15:00", "16:00", "Bai'ah Ceremony", "Main Prayer Hall, SHAS Mosque", "Programme", "All", "Discipline", "Broadcast.", "shas-mosque", true, "after_break", "2026-09-25"],
  ["2026-09-25", "Friday", "event_week", "08:30", "17:00", "Exhibition and Activation of RHB Card & ASNB Account", "Foyer, SHAS Mosque", "Exhibition", "All", "Program Coordinator", "", "", false, undefined, undefined, true]
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

    const blockId = buildBlockId(item.blockGroup, item.block);
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
