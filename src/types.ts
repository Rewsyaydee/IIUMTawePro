export type Role = "student" | "committee" | "head" | "mainboard";

export type Bureau =
  | "Catering"
  | "PrepTech"
  | "Registration"
  | "Program Coordinator"
  | "Special Task"
  | "Discipline"
  | "Multimedia"
  | "Welfare";

export type Week = "preparation" | "event_week";

export type ReadinessStatus = "pending" | "ready" | "issues";

export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";

export type Priority = "low" | "medium" | "high" | "critical";

export type AttendanceStatus = "pending_review" | "sent_to_mainboard" | "rejected";

export type BureauOperationStatus = "pending" | "active" | "ready" | "issue" | "done";

export type AdminRole = Exclude<Role, "student">;

export interface MockUser {
  id: string;
  telegramId: string;
  name: string;
  role: Role;
  bureau?: Bureau;
  matricNumber?: string;
  kulliyyah?: string;
}

export interface InviteCode {
  id: string;
  code: string;
  role: AdminRole;
  bureau?: Bureau;
  createdAt: string;
  expiresAt?: string;
  isUsed: boolean;
  isReusable?: boolean;
  usedBy?: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  table: string;
  recordId?: string;
  details: string;
  timestamp: string;
}

export type SessionBlock = "before_break" | "after_break" | "concurrent";

export interface ScheduleItem {
  id: string;
  date: string;
  day: string;
  week: Week;
  scheduledStartTime: string;
  scheduledEndTime: string;
  title: string;
  venue: string;
  tag: string;
  audience: "All" | "Students" | "Committee";
  description?: string;
  isLive: boolean;
  notifyMinutesBefore: number;
  responsibleBureau?: Bureau;
  preSessionTasks?: string[];
  readinessStatus?: ReadinessStatus;
  venueCode?: string;
  isAttendanceRequired?: boolean;
  block?: SessionBlock;
  blockGroup?: string;
  isConcurrent?: boolean;
  track?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  priority: boolean;
}

export interface WellbeingReport {
  id: string;
  reference: string;
  studentName: string;
  phone: string;
  category: string;
  notes: string;
  status: "submitted" | "responded" | "resolved" | "escalated";
  submittedAt: string;
  assignedTo?: string;
  resolvedAt?: string;
}

export interface PoaTask {
  id: string;
  bureau: Bureau;
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  assignedTo: string;
  status: TaskStatus;
  priority: Priority;
  notifyMinutesBefore: number;
  isRecurring: boolean;
}

export interface AttendanceProof {
  id: string;
  date: string;
  userId: string;
  telegramId: string;
  committeeName: string;
  bureau: Bureau;
  selfieDataUrl: string;
  submittedAt: string;
  status: AttendanceStatus;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface BureauOperation {
  id: string;
  bureau: Bureau;
  tool:
    | "coupon_sessions"
    | "food_distribution"
    | "cleanliness"
    | "walkie_talkies"
    | "battery_tracking"
    | "lost_found"
    | "kit_distribution"
    | "vip_robes"
    | "run_of_show"
    | "session_timers"
    | "vip_cues"
    | "attendance_sessions"
    | "toilet_sign"
    | "siren_logs"
    | "dress_code_incidents"
    | "slide_handoffs"
    | "nametag_batches"
    | "sickbay_log"
    | "medicine_stock";
  title: string;
  detail: string;
  owner: string;
  status: BureauOperationStatus;
  metric: string;
  updatedAt: string;
}

export interface Banner {
  id: string;
  title: string;
  body: string;
  type: "info" | "success" | "warning" | "emergency";
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  dismissedBy?: string[];
}

export interface AnnouncementLink {
  label: string;
  url: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: "info" | "urgent" | "emergency";
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  dismissedBy?: string[];
  links?: AnnouncementLink[];
  tags?: string[];
}

export interface MockNotification {
  id: string;
  targetRole: Role | "all";
  targetBureau?: Bureau | "all";
  title: string;
  body: string;
  type: "mock_push" | "mock_emergency" | "mock_attendance" | "mock_bureau_alert" | "mock_global";
  sentAt: string;
  sentBy: string;
  relatedTaskId?: string;
}

export type StudentAttendanceStatus = "present" | "absent" | "excused";

export interface StudentAttendance {
  id: string;
  userId: string;
  scheduleItemId: string;
  eventTitle: string;
  studentName: string;
  matricNumber: string;
  kulliyyah?: string;
  latitude: number;
  longitude: number;
  status: StudentAttendanceStatus;
  excuse?: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}
