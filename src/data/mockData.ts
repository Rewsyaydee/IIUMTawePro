import type {
  Announcement,
  AuditLogEntry,
  AttendanceProof,
  Banner,
  BureauOperation,
  EmergencyContact,
  InviteCode,
  MockNotification,
  MockUser,
  PoaTask,
  ScheduleItem,
  StudentAttendance,
  WellbeingReport
} from "../types";
import { realEventSchedule } from "./eventSchedule";

function selfiePlaceholder(label: string, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420" viewBox="0 0 420 420">
    <rect width="420" height="420" fill="${color}"/>
    <circle cx="210" cy="152" r="68" fill="#fff7df" opacity=".92"/>
    <path d="M86 354c28-74 76-112 124-112s96 38 124 112" fill="#fff7df" opacity=".92"/>
    <text x="210" y="392" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#fff7df">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const mockUsers: MockUser[] = [
  {
    id: "u-student",
    telegramId: "guest",
    name: "Guest Student",
    role: "student"
  },
  {
    id: "u-committee",
    telegramId: "1001002",
    name: "Hakim Catering",
    role: "committee",
    bureau: "Catering"
  },
  {
    id: "u-head",
    telegramId: "1001003",
    name: "Nisa Welfare",
    role: "head",
    bureau: "Welfare"
  },
  {
    id: "u-special-task",
    telegramId: "1001005",
    name: "Sofea Special Task",
    role: "committee",
    bureau: "Special Task"
  },
  {
    id: "u-mainboard",
    telegramId: "1001004",
    name: "Mainboard Ops",
    role: "mainboard"
  }
];

export const initialSchedule: ScheduleItem[] = realEventSchedule;

export const emergencyContacts: EmergencyContact[] = [
  {
    id: "c-001",
    name: "Event Control Room",
    role: "Mainboard Hotline",
    phone: "+60123456789",
    priority: true
  },
  {
    id: "c-002",
    name: "Welfare Lead",
    role: "Medical and Sickbay",
    phone: "+60198765432",
    priority: true
  },
  {
    id: "c-003",
    name: "Security Desk",
    role: "Venue Safety",
    phone: "+60112223334",
    priority: false
  },
  {
    id: "c-004",
    name: "PrepTech Standby",
    role: "Walkie and AV Fallback",
    phone: "+60115554444",
    priority: false
  }
];

export const initialReports: WellbeingReport[] = [
  {
    id: "wr-001",
    reference: "WEL-2401",
    studentName: "Nur Alya",
    phone: "+60122222222",
    category: "Dizzy",
    notes: "Needs water and shaded waiting area.",
    status: "responded",
    submittedAt: "2026-02-24T07:52:00.000Z",
    assignedTo: "Nisa Welfare"
  },
  {
    id: "wr-002",
    reference: "WEL-2402",
    studentName: "Muhammad Iman",
    phone: "+60133333333",
    category: "Lost group",
    notes: "Waiting near registration gate two.",
    status: "submitted",
    submittedAt: "2026-02-24T08:06:00.000Z"
  }
];

export const initialTasks: PoaTask[] = [
  {
    id: "t-001",
    bureau: "Catering",
    title: "Verify breakfast vendor arrival",
    description: "Confirm truck access, count meals, and release distribution lanes.",
    dueDate: "2026-02-23",
    dueTime: "06:45",
    assignedTo: "Hakim Catering",
    status: "in_progress",
    priority: "high",
    notifyMinutesBefore: 20,
    isRecurring: true
  },
  {
    id: "t-002",
    bureau: "Registration",
    title: "Open QR check-in lanes",
    description: "Prepare scanners and split students by group prefix.",
    dueDate: "2026-02-23",
    dueTime: "07:00",
    assignedTo: "Mira Registration",
    status: "blocked",
    priority: "critical",
    notifyMinutesBefore: 15,
    isRecurring: false
  },
  {
    id: "t-003",
    bureau: "Welfare",
    title: "Sickbay readiness sweep",
    description: "Restock water, ice packs, medication sheet, and privacy screen.",
    dueDate: "2026-02-23",
    dueTime: "07:15",
    assignedTo: "Nisa Welfare",
    status: "todo",
    priority: "critical",
    notifyMinutesBefore: 30,
    isRecurring: true
  },
  {
    id: "t-004",
    bureau: "Multimedia",
    title: "Opening montage handoff",
    description: "Confirm latest render, backup drive, and AV booth copy.",
    dueDate: "2026-02-23",
    dueTime: "08:30",
    assignedTo: "Danial Media",
    status: "todo",
    priority: "medium",
    notifyMinutesBefore: 30,
    isRecurring: false
  },
  {
    id: "t-005",
    bureau: "Discipline",
    title: "Prayer movement route check",
    description: "Check corridor lights and student movement line.",
    dueDate: "2026-02-24",
    dueTime: "05:00",
    assignedTo: "Izzat Discipline",
    status: "todo",
    priority: "high",
    notifyMinutesBefore: 25,
    isRecurring: true
  }
];

export const initialAttendanceProofs: AttendanceProof[] = [
  {
    id: "ap-001",
    date: "2026-02-23",
    userId: "u-committee",
    telegramId: "1001002",
    committeeName: "Hakim Catering",
    bureau: "Catering",
    selfieDataUrl: selfiePlaceholder("Hakim", "#0f7a5c"),
    submittedAt: "2026-02-23T08:54:00.000Z",
    status: "pending_review"
  },
  {
    id: "ap-002",
    date: "2026-02-23",
    userId: "u-head",
    telegramId: "1001003",
    committeeName: "Nisa Welfare",
    bureau: "Welfare",
    selfieDataUrl: selfiePlaceholder("Nisa", "#217b88"),
    submittedAt: "2026-02-23T08:58:00.000Z",
    status: "sent_to_mainboard",
    reviewedBy: "Sofea Special Task",
    reviewedAt: "2026-02-23T09:10:00.000Z"
  }
];

export const initialBureauOperations: BureauOperation[] = [
  {
    id: "bo-cat-001",
    bureau: "Catering",
    tool: "coupon_sessions",
    title: "Breakfast coupon lane",
    detail: "Scan and reconcile coupons before student release.",
    owner: "Hakim Catering",
    status: "active",
    metric: "412 / 600 claimed",
    updatedAt: "2026-02-23T09:24:00.000Z"
  },
  {
    id: "bo-cat-002",
    bureau: "Catering",
    tool: "food_distribution",
    title: "Packed lunch checklist",
    detail: "Confirm meal count, vegetarian packs, and late pickup table.",
    owner: "Alya Catering",
    status: "pending",
    metric: "3 checklist items open",
    updatedAt: "2026-02-23T09:05:00.000Z"
  },
  {
    id: "bo-cat-003",
    bureau: "Catering",
    tool: "cleanliness",
    title: "Dining zone sweep",
    detail: "Table reset, waste bags, and spill station readiness.",
    owner: "Farid Catering",
    status: "ready",
    metric: "Zone A ready",
    updatedAt: "2026-02-23T09:18:00.000Z"
  },
  {
    id: "bo-prep-001",
    bureau: "PrepTech",
    tool: "walkie_talkies",
    title: "Walkie lending log",
    detail: "Track unit holders and analog fallback handover.",
    owner: "Ammar PrepTech",
    status: "active",
    metric: "18 / 22 issued",
    updatedAt: "2026-02-23T09:20:00.000Z"
  },
  {
    id: "bo-prep-002",
    bureau: "PrepTech",
    tool: "battery_tracking",
    title: "Battery rotation",
    detail: "Swap low units before opening ceremony.",
    owner: "Sofia PrepTech",
    status: "issue",
    metric: "4 low batteries",
    updatedAt: "2026-02-23T09:26:00.000Z"
  },
  {
    id: "bo-reg-001",
    bureau: "Registration",
    tool: "lost_found",
    title: "Lost and found counter",
    detail: "Record found items and claimant verification.",
    owner: "Mira Registration",
    status: "active",
    metric: "2 items logged",
    updatedAt: "2026-02-23T09:31:00.000Z"
  },
  {
    id: "bo-reg-002",
    bureau: "Registration",
    tool: "kit_distribution",
    title: "Welcome kit distribution",
    detail: "Track kit pickup by student group.",
    owner: "Irfan Registration",
    status: "active",
    metric: "71% distributed",
    updatedAt: "2026-02-23T09:35:00.000Z"
  },
  {
    id: "bo-reg-003",
    bureau: "Registration",
    tool: "vip_robes",
    title: "VIP robe checklist",
    detail: "Confirm robe count and holding area readiness.",
    owner: "Hana Registration",
    status: "ready",
    metric: "12 robes ready",
    updatedAt: "2026-02-23T09:10:00.000Z"
  },
  {
    id: "bo-prog-001",
    bureau: "Program Coordinator",
    tool: "run_of_show",
    title: "Opening ceremony run sheet",
    detail: "Speaker order, handoff points, and stage manager cues.",
    owner: "Imran Program",
    status: "ready",
    metric: "Cue 4 next",
    updatedAt: "2026-02-23T09:42:00.000Z"
  },
  {
    id: "bo-prog-002",
    bureau: "Program Coordinator",
    tool: "session_timers",
    title: "Session timer monitor",
    detail: "Watch countdown and flag overtime early.",
    owner: "Nadia Program",
    status: "pending",
    metric: "Starts 09:00",
    updatedAt: "2026-02-23T09:12:00.000Z"
  },
  {
    id: "bo-prog-003",
    bureau: "Program Coordinator",
    tool: "vip_cues",
    title: "VIP cue board",
    detail: "Cue arrival, seating, montage, and photo sequence.",
    owner: "Izz Program",
    status: "ready",
    metric: "4 cues staged",
    updatedAt: "2026-02-23T09:25:00.000Z"
  },
  {
    id: "bo-special-001",
    bureau: "Special Task",
    tool: "attendance_sessions",
    title: "Committee attendance QR",
    detail: "Generate session link and reconcile selfie punch card queue.",
    owner: "Sofea Special Task",
    status: "active",
    metric: "1 proof pending",
    updatedAt: "2026-02-23T09:32:00.000Z"
  },
  {
    id: "bo-special-002",
    bureau: "Special Task",
    tool: "toilet_sign",
    title: "Toilet sign live toggle",
    detail: "Publish available, cleaning, or closed status for venue toilets.",
    owner: "Danish Special Task",
    status: "ready",
    metric: "Block B available",
    updatedAt: "2026-02-23T09:14:00.000Z"
  },
  {
    id: "bo-disc-001",
    bureau: "Discipline",
    tool: "siren_logs",
    title: "Wake-up call checklist",
    detail: "Track siren rounds, corridor sweep, and prayer movement.",
    owner: "Izzat Discipline",
    status: "done",
    metric: "4 / 4 zones complete",
    updatedAt: "2026-02-23T08:08:00.000Z"
  },
  {
    id: "bo-disc-002",
    bureau: "Discipline",
    tool: "dress_code_incidents",
    title: "Dress code incident log",
    detail: "Record soft reminders and escalate repeat issues.",
    owner: "Sarah Discipline",
    status: "pending",
    metric: "0 escalations",
    updatedAt: "2026-02-23T09:00:00.000Z"
  },
  {
    id: "bo-media-001",
    bureau: "Multimedia",
    tool: "slide_handoffs",
    title: "Slide handoff tracker",
    detail: "Confirm latest deck, backup copy, and booth receipt.",
    owner: "Danial Media",
    status: "issue",
    metric: "Awaiting final montage",
    updatedAt: "2026-02-23T09:38:00.000Z"
  },
  {
    id: "bo-media-002",
    bureau: "Multimedia",
    tool: "nametag_batches",
    title: "Nametag batch print",
    detail: "Track reprints for late committee and VIP changes.",
    owner: "Lina Media",
    status: "active",
    metric: "Batch 3 printing",
    updatedAt: "2026-02-23T09:28:00.000Z"
  },
  {
    id: "bo-welfare-001",
    bureau: "Welfare",
    tool: "sickbay_log",
    title: "Sickbay patient log",
    detail: "Track active patients, treatment, and time-out.",
    owner: "Nisa Welfare",
    status: "active",
    metric: "1 active patient",
    updatedAt: "2026-02-23T09:40:00.000Z"
  },
  {
    id: "bo-welfare-002",
    bureau: "Welfare",
    tool: "medicine_stock",
    title: "Medicine stock tracker",
    detail: "Watch stock thresholds and alert Welfare Head.",
    owner: "Aisyah Welfare",
    status: "issue",
    metric: "Panadol below threshold",
    updatedAt: "2026-02-23T09:22:00.000Z"
  }
];

export const initialBanners: Banner[] = [
  {
    id: "b-001",
    title: "Official schedule loaded",
    body: "Ta'aruf Week Semester 2, 2025/2026 programme is available.",
    type: "info",
    isActive: true,
    createdAt: "2026-02-19T10:00:00.000Z"
  }
];

export const initialNotifications: MockNotification[] = [
  {
    id: "n-001",
    targetRole: "committee",
    targetBureau: "Registration",
    title: "Mock: programme schedule",
    body: "Official Ta'aruf Week schedule has been loaded for public view.",
    type: "mock_push",
    sentAt: "2026-02-19T10:20:00.000Z",
    sentBy: "Mainboard Ops"
  }
];

export const initialStudentAttendances: StudentAttendance[] = [
  {
    id: "sa-001",
    userId: "u-student",
    scheduleItemId: "block-2026-02-22-before_break",
    eventTitle: "Sunday - Before Break",
    studentName: "Rusyaidi",
    matricNumber: "2410000",
    kulliyyah: "KICT",
    latitude: 3.250950,
    longitude: 101.733678,
    status: "present",
    submittedAt: "2026-02-22T10:35:00.000Z"
  },
  {
    id: "sa-002",
    userId: "u-student",
    scheduleItemId: "block-2026-02-22-after_break",
    eventTitle: "Sunday - After Break",
    studentName: "Rusyaidi",
    matricNumber: "2410000",
    kulliyyah: "KICT",
    latitude: 3.251366,
    longitude: 101.734955,
    status: "present",
    submittedAt: "2026-02-22T14:05:00.000Z"
  },
  {
    id: "sa-003",
    userId: "u-student",
    scheduleItemId: "block-2026-02-23-before_break",
    eventTitle: "Monday - Before Break",
    studentName: "Rusyaidi",
    matricNumber: "2410000",
    kulliyyah: "KICT",
    latitude: 3.250950,
    longitude: 101.733678,
    status: "present",
    submittedAt: "2026-02-23T08:50:00.000Z"
  }
];

export const initialInviteCodes: InviteCode[] = [
  {
    id: "inv-committee-shared",
    code: "OiAkuNakTaweNi",
    role: "committee",
    createdAt: "2026-02-19T10:00:00.000Z",
    expiresAt: "2026-03-15T23:59:00.000Z",
    isUsed: false,
    isReusable: true
  },
  {
    id: "inv-001",
    code: "MB-TAARUF-2401",
    role: "mainboard",
    createdAt: "2026-02-19T10:00:00.000Z",
    expiresAt: "2026-03-15T23:59:00.000Z",
    isUsed: false
  },
  {
    id: "inv-002",
    code: "WEL-HEAD-2402",
    role: "head",
    bureau: "Welfare",
    createdAt: "2026-02-19T10:05:00.000Z",
    expiresAt: "2026-03-15T23:59:00.000Z",
    isUsed: true,
    usedBy: "Nisa Welfare"
  },
  {
    id: "inv-003",
    code: "ST-COM-2403",
    role: "committee",
    bureau: "Special Task",
    createdAt: "2026-02-19T10:08:00.000Z",
    expiresAt: "2026-03-15T23:59:00.000Z",
    isUsed: true,
    usedBy: "Sofea Special Task"
  }
];

export const initialAuditLog: AuditLogEntry[] = [
  {
    id: "audit-001",
    actorId: "u-mainboard",
    actorName: "Mainboard Ops",
    action: "Loaded official schedule",
    table: "schedule",
    recordId: "real-s-010",
    details: "Ta'aruf Week Semester 2, 2025/2026 schedule was loaded from the markdown source.",
    timestamp: "2026-02-19T10:00:00.000Z"
  },
  {
    id: "audit-002",
    actorId: "u-special-task",
    actorName: "Sofea Special Task",
    action: "Verified attendance proof",
    table: "attendance_proofs",
    recordId: "ap-002",
    details: "Nisa Welfare proof was sent to mainboard.",
    timestamp: "2026-02-23T09:10:00.000Z"
  },
  {
    id: "audit-003",
    actorId: "u-mainboard",
    actorName: "Mainboard Ops",
    action: "Generated invite code",
    table: "invite_codes",
    recordId: "inv-001",
    details: "Created unused mainboard invite for event operations.",
    timestamp: "2026-02-19T10:00:00.000Z"
  }
];

export const initialAnnouncements: Announcement[] = [
  {
    id: "ann-001",
    title: "ANNOUNCEMENT FOR WAKE UP CALL",
    body: "Assalamualaikum w.b.t.\n\nA friendly reminder to all new intake students of Ta'aruf Week Semester 2, 2025/2026 Intake.\n\nHere is the schedule of wake-up calls on 24th February 2026 (Tuesday) to make sure the programme goes smoothly.\n\n5:00 AM\nFirst siren for wake-up\n\n5:30 AM\nSecond siren for wake-up\n\n6:00 AM\nThird siren for wake-up\n\n6:45 AM\nLast siren and announcement\n\n7:00 AM\nDepart to bus stop\n\nREMINDER\n1. Please follow the dress code.\n2. Bring along your own UMBRELLA for all sessions IN CASE OF RAINING and POWERBANK\n3. NO JEANS, SANDALS and SLIPPERS are allowed during the program.\n4. For sisters, you are advised to bring along your telekung and prayer mat.\n\nThank you for your kind cooperation.\n\nBest regards,\nTa'aruf Week Student Committee,\nSemester 2, 2025/2026.",
    type: "urgent",
    isActive: true,
    createdAt: "2026-02-23T20:00:00.000Z",
    tags: ["wake-up", "schedule", "reminder"]
  },
  {
    id: "ann-002",
    title: "ANNOUNCEMENT FOR LOST & FOUND ITEMS",
    body: "Assalamualaikum w.b.t.\n\nAttention to all new intake students for Ta'aruf Week Semester 2, 2025/2026, who have lost their items.\n\nPlease fill up this form if you have any concerns about your lost belongings.\n\nThank you for your attention and cooperation.\n\nBest regards,\nTa'aruf Week Student Committee,\nSemester 2, 2025/2026.",
    type: "info",
    isActive: true,
    createdAt: "2026-02-24T14:00:00.000Z",
    links: [
      { label: "Lost & Found Form", url: "https://docs.google.com/forms/d/1DnPSncw0VCGm7vQhBSQn-q0z5Ol6p8HuK0wkE9P2kFk/edit" }
    ],
    tags: ["lost-found", "form"]
  },
  {
    id: "ann-003",
    title: "ANNOUNCEMENT FOR NIGHT SESSION TA'ARUF WEEK SEMESTER 2, 2025/2026",
    body: "Assalamualaikum w.b.t.\n\nReminder to all new intake students to attend the night session on 23rd February 2026 at your respective mahallah. Your attendance is COMPULSORY. Hereby are the details for the session:\n\nSlot: My Mahallah My Second Home\nVenue: Respective Mahallah\nTime: Based on respective Mahallah\nDresscode: Shariah Compliance\n\nThank you for your kind cooperation.\n\nBest regards,\nTa'aruf Week Student Committee,\nSemester 2, 2025/2026.",
    type: "urgent",
    isActive: true,
    createdAt: "2026-02-22T18:00:00.000Z",
    tags: ["night-session", "compulsory", "mahallah"]
  },
  {
    id: "ann-004",
    title: "KULLIYYAH GROUP LINKS FOR GOMBAK CAMPUS NEW INTAKE STUDENTS SEMESTER 2, 2025/2026",
    body: "Assalamualaikum w.b.t.\n\nDear Brothers and Sisters,\n\nThis is the group link of each Kulliyyah in the Gombak campus for your reference. Do enter your respective kulliyyah's group for more information on the Ihsan Madani session and related matters.\n\nDo follow our social media accounts for more updates on Ta'aruf Week.\n\nBest regards,\nTa'aruf Week Student Committee\nSemester 2, 2025/2026.",
    type: "info",
    isActive: true,
    createdAt: "2026-02-21T10:00:00.000Z",
    links: [
      { label: "KICT Group", url: "https://chat.whatsapp.com/JXbSUV7VBaN4O4npHEkKvP" },
      { label: "KOE Group", url: "https://chat.whatsapp.com/EYM80Ik3Xk02QRIFqxH9zj" },
      { label: "KENMS Group", url: "https://chat.whatsapp.com/BIdTmnh3cBp0NK21MQMxuw" },
      { label: "KOED Group", url: "https://chat.whatsapp.com/JGM2xHgO5K8GxxPHkxyfb2" },
      { label: "AIKOL Group", url: "https://chat.whatsapp.com/E368MgBhX2JL7tj4UHvz5j" },
      { label: "KAED Group", url: "https://chat.whatsapp.com/GH4ERekX4qOIWnG9HyY6y5" },
      { label: "AHAS KIRKHS Group", url: "https://chat.whatsapp.com/HO0lnrIxGCi2xL4qLM6Ymb" }
    ],
    tags: ["kulliyyah", "whatsapp", "links"]
  }
];
