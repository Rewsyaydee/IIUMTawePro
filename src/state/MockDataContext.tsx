import { createContext, useContext, useMemo, useState } from "react";
import {
  initialAnnouncements,
  initialAuditLog,
  initialAttendanceProofs,
  initialBanners,
  initialBureauOperations,
  initialInviteCodes,
  initialNotifications,
  initialReports,
  initialSchedule,
  initialTasks
} from "../data/mockData";
import type {
  Announcement,
  AuditLogEntry,
  AttendanceProof,
  AttendanceStatus,
  Banner,
  BureauOperation,
  BureauOperationStatus,
  Bureau,
  InviteCode,
  MockNotification,
  PoaTask,
  ReadinessStatus,
  Role,
  ScheduleItem,
  TaskStatus,
  WellbeingReport
} from "../types";
import { useMockUser } from "./MockUserContext";

type ReportInput = Pick<WellbeingReport, "studentName" | "phone" | "category" | "notes">;

type TaskInput = Pick<PoaTask, "bureau" | "title" | "description" | "dueDate" | "dueTime" | "assignedTo" | "priority">;

type EmergencyInput = {
  title: string;
  body: string;
  targetRole: Role | "all";
  targetBureau?: Bureau | "all";
};

type GlobalNotificationInput = EmergencyInput & {
  createBanner: boolean;
};

type AnnouncementInput = Pick<Announcement, "title" | "body" | "type" | "links" | "tags">;

type AttendanceInput = Pick<AttendanceProof, "selfieDataUrl">;

type InviteInput = Pick<InviteCode, "role" | "bureau" | "expiresAt">;

type AuditInput = Pick<AuditLogEntry, "action" | "table" | "details" | "recordId">;

type ScheduleInput = Omit<ScheduleItem, "id">;

type MockDataContextValue = {
  schedule: ScheduleItem[];
  reports: WellbeingReport[];
  tasks: PoaTask[];
  attendanceProofs: AttendanceProof[];
  bureauOperations: BureauOperation[];
  banners: Banner[];
  notifications: MockNotification[];
  inviteCodes: InviteCode[];
  auditLog: AuditLogEntry[];
  announcements: Announcement[];
  updateReadiness: (id: string, status: ReadinessStatus) => void;
  updateScheduleItem: (id: string, patch: Partial<ScheduleItem>) => void;
  createScheduleItem: (input: ScheduleInput) => ScheduleItem;
  deleteScheduleItem: (id: string) => void;
  addReport: (input: ReportInput) => WellbeingReport;
  updateReportStatus: (id: string, status: WellbeingReport["status"]) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  addTask: (input: TaskInput) => PoaTask;
  submitAttendanceProof: (input: AttendanceInput) => AttendanceProof;
  reviewAttendanceProof: (id: string, status: Extract<AttendanceStatus, "sent_to_mainboard" | "rejected">) => void;
  updateBureauOperationStatus: (id: string, status: BureauOperationStatus) => void;
  sendBureauOperationAlert: (id: string) => void;
  dismissBanner: (id: string, userId: string) => void;
  deactivateBanner: (id: string) => void;
  createEmergencyBroadcast: (input: EmergencyInput) => void;
  sendGlobalNotification: (input: GlobalNotificationInput) => void;
  generateInviteCode: (input: InviteInput) => InviteCode;
  redeemInviteCode: (code: string, usedBy: string) => InviteCode | undefined;
  recordAuditLog: (input: AuditInput) => AuditLogEntry;
  createAnnouncement: (input: AnnouncementInput) => Announcement;
  dismissAnnouncement: (id: string, userId: string) => void;
  deactivateAnnouncement: (id: string) => void;
};

const MockDataContext = createContext<MockDataContextValue | undefined>(undefined);

function stampId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function MockDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useMockUser();
  const [schedule, setSchedule] = useState(initialSchedule);
  const [reports, setReports] = useState(initialReports);
  const [tasks, setTasks] = useState(initialTasks);
  const [attendanceProofs, setAttendanceProofs] = useState(initialAttendanceProofs);
  const [bureauOperations, setBureauOperations] = useState(initialBureauOperations);
  const [banners, setBanners] = useState(initialBanners);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [inviteCodes, setInviteCodes] = useState(initialInviteCodes);
  const [auditLog, setAuditLog] = useState(initialAuditLog);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);

  const value = useMemo<MockDataContextValue>(() => {
    const recordAuditLog = (input: AuditInput) => {
      const next: AuditLogEntry = {
        id: stampId("audit"),
        actorId: user.id,
        actorName: user.name,
        timestamp: new Date().toISOString(),
        ...input
      };

      setAuditLog((items) => [next, ...items]);
      return next;
    };

    const updateReadiness = (id: string, status: ReadinessStatus) => {
      setSchedule((items) => items.map((item) => (item.id === id ? { ...item, readinessStatus: status } : item)));
      recordAuditLog({
        action: "Updated schedule readiness",
        table: "schedule",
        recordId: id,
        details: `Readiness changed to ${status}.`
      });
    };

    const updateScheduleItem = (id: string, patch: Partial<ScheduleItem>) => {
      setSchedule((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
      recordAuditLog({
        action: patch.isLive === true ? "Published schedule item" : patch.isLive === false ? "Unpublished schedule item" : "Updated schedule item",
        table: "schedule",
        recordId: id,
        details: patch.title ? `Updated ${patch.title}.` : "Schedule details were changed."
      });
    };

    const createScheduleItem = (input: ScheduleInput) => {
      const next: ScheduleItem = {
        id: stampId("s"),
        ...input
      };

      setSchedule((items) => [...items, next]);
      recordAuditLog({
        action: "Created schedule item",
        table: "schedule",
        recordId: next.id,
        details: `${next.title} added for ${next.date}.`
      });
      return next;
    };

    const deleteScheduleItem = (id: string) => {
      const removed = schedule.find((item) => item.id === id);
      setSchedule((items) => items.filter((item) => item.id !== id));
      recordAuditLog({
        action: "Deleted schedule item",
        table: "schedule",
        recordId: id,
        details: removed ? `${removed.title} was removed from the mock programme.` : "Schedule item removed."
      });
    };

    const addReport = (input: ReportInput) => {
      const next: WellbeingReport = {
        id: stampId("wr"),
        reference: `WEL-${Math.floor(2400 + reports.length + 1)}`,
        ...input,
        status: "submitted",
        submittedAt: new Date().toISOString()
      };

      setReports((items) => [next, ...items]);
      setNotifications((items) => [
        {
          id: stampId("n"),
          targetRole: "committee",
          targetBureau: "Welfare",
          title: "Mock: new wellbeing report",
          body: `${next.reference} submitted by ${next.studentName}.`,
          type: "mock_push",
          sentAt: new Date().toISOString(),
          sentBy: "System"
        },
        ...items
      ]);
      return next;
    };

    const updateReportStatus = (id: string, status: WellbeingReport["status"]) => {
      setReports((items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
                assignedTo: item.assignedTo || user.name,
                resolvedAt: status === "resolved" ? new Date().toISOString() : item.resolvedAt
              }
            : item
        )
      );
      recordAuditLog({
        action: "Updated wellbeing report",
        table: "wellbeing_reports",
        recordId: id,
        details: `Report status changed to ${status}.`
      });
    };

    const updateTaskStatus = (id: string, status: TaskStatus) => {
      setTasks((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
      recordAuditLog({
        action: "Updated task status",
        table: "poa_tasks",
        recordId: id,
        details: `Task status changed to ${status}.`
      });
    };

    const addTask = (input: TaskInput) => {
      const next: PoaTask = {
        id: stampId("t"),
        ...input,
        status: "todo",
        notifyMinutesBefore: 20,
        isRecurring: false
      };

      setTasks((items) => [next, ...items]);
      setNotifications((items) => [
        {
          id: stampId("n"),
          targetRole: "committee",
          targetBureau: input.bureau,
          title: "Mock: new bureau task",
          body: `${input.title} assigned to ${input.assignedTo}.`,
          type: "mock_push",
          sentAt: new Date().toISOString(),
          sentBy: user.name,
          relatedTaskId: next.id
        },
        ...items
      ]);
      recordAuditLog({
        action: "Created bureau task",
        table: "poa_tasks",
        recordId: next.id,
        details: `${next.title} assigned to ${next.assignedTo}.`
      });
      return next;
    };

    const submitAttendanceProof = (input: AttendanceInput) => {
      if (!user.bureau) {
        throw new Error("Attendance proof requires a bureau.");
      }

      const now = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const next: AttendanceProof = {
        id: stampId("ap"),
        date,
        userId: user.id,
        telegramId: user.telegramId,
        committeeName: user.name,
        bureau: user.bureau,
        selfieDataUrl: input.selfieDataUrl,
        submittedAt: now.toISOString(),
        status: "pending_review"
      };

      setAttendanceProofs((items) => {
        const withoutToday = items.filter((item) => !(item.userId === user.id && item.date === date));
        return [next, ...withoutToday];
      });
      setNotifications((items) => [
        {
          id: stampId("n"),
          targetRole: "committee",
          targetBureau: "Special Task",
          title: "Mock: attendance proof",
          body: `${next.committeeName} submitted punch card proof.`,
          type: "mock_attendance",
          sentAt: now.toISOString(),
          sentBy: "System"
        },
        ...items
      ]);
      recordAuditLog({
        action: "Submitted attendance proof",
        table: "attendance_proofs",
        recordId: next.id,
        details: `${next.committeeName} submitted punch card proof.`
      });
      return next;
    };

    const reviewAttendanceProof = (id: string, status: Extract<AttendanceStatus, "sent_to_mainboard" | "rejected">) => {
      const now = new Date().toISOString();
      let reviewedProof: AttendanceProof | undefined;

      setAttendanceProofs((items) =>
        items.map((item) => {
          if (item.id !== id) return item;
          reviewedProof = {
            ...item,
            status,
            reviewedBy: user.name,
            reviewedAt: now
          };
          return reviewedProof;
        })
      );

      if (status === "sent_to_mainboard") {
        setNotifications((items) => [
          {
            id: stampId("n"),
            targetRole: "mainboard",
            targetBureau: "all",
            title: "Mock: attendance verified",
            body: reviewedProof ? `${reviewedProof.committeeName} verified by Special Task.` : "Attendance proof verified.",
            type: "mock_attendance",
            sentAt: now,
            sentBy: user.name
          },
          ...items
        ]);
      }
      recordAuditLog({
        action: status === "sent_to_mainboard" ? "Verified attendance proof" : "Rejected attendance proof",
        table: "attendance_proofs",
        recordId: id,
        details: reviewedProof ? `${reviewedProof.committeeName} changed to ${status}.` : `Attendance proof changed to ${status}.`
      });
    };

    const updateBureauOperationStatus = (id: string, status: BureauOperationStatus) => {
      const now = new Date().toISOString();
      setBureauOperations((items) => items.map((item) => (item.id === id ? { ...item, status, updatedAt: now } : item)));
      recordAuditLog({
        action: "Updated bureau operation",
        table: "bureau_operations",
        recordId: id,
        details: `Operation status changed to ${status}.`
      });
    };

    const sendBureauOperationAlert = (id: string) => {
      const operation = bureauOperations.find((item) => item.id === id);
      if (!operation) return;

      setNotifications((items) => [
        {
          id: stampId("n"),
          targetRole: "committee",
          targetBureau: operation.bureau,
          title: `Mock: ${operation.bureau} ops update`,
          body: `${operation.title}: ${operation.metric}.`,
          type: "mock_bureau_alert",
          sentAt: new Date().toISOString(),
          sentBy: user.name
        },
        ...items
      ]);
      recordAuditLog({
        action: "Sent bureau alert",
        table: "notifications",
        recordId: operation.id,
        details: `${operation.bureau} alert sent for ${operation.title}.`
      });
    };

    const dismissBanner = (id: string, userId: string) => {
      setBanners((items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                dismissedBy: [...(item.dismissedBy || []), userId]
              }
            : item
        )
      );
    };

    const deactivateBanner = (id: string) => {
      setBanners((items) => items.map((item) => (item.id === id ? { ...item, isActive: false } : item)));
      recordAuditLog({
        action: "Deactivated banner",
        table: "banners",
        recordId: id,
        details: "Banner was removed from active display."
      });
    };

    const createEmergencyBroadcast = (input: EmergencyInput) => {
      const now = new Date().toISOString();
      const banner: Banner = {
        id: stampId("b"),
        title: input.title,
        body: input.body,
        type: "emergency",
        isActive: true,
        createdAt: now
      };

      const notification: MockNotification = {
        id: stampId("n"),
        targetRole: input.targetRole,
        targetBureau: input.targetBureau,
        title: input.title,
        body: input.body,
        type: "mock_emergency",
        sentAt: now,
        sentBy: user.name
      };

      setBanners((items) => [banner, ...items]);
      setNotifications((items) => [notification, ...items]);
      recordAuditLog({
        action: "Sent emergency broadcast",
        table: "notifications",
        recordId: notification.id,
        details: `${input.title} sent to ${input.targetRole}.`
      });
    };

    const sendGlobalNotification = (input: GlobalNotificationInput) => {
      const now = new Date().toISOString();
      const notification: MockNotification = {
        id: stampId("n"),
        targetRole: input.targetRole,
        targetBureau: input.targetBureau,
        title: input.title,
        body: input.body,
        type: "mock_global",
        sentAt: now,
        sentBy: user.name
      };

      setNotifications((items) => [notification, ...items]);
      if (input.createBanner) {
        setBanners((items) => [
          {
            id: stampId("b"),
            title: input.title,
            body: input.body,
            type: "info",
            isActive: true,
            createdAt: now
          },
          ...items
        ]);
      }
      recordAuditLog({
        action: "Sent official notice",
        table: "notifications",
        recordId: notification.id,
        details: `${input.title} sent to ${input.targetRole}.`
      });
    };

    const generateInviteCode = (input: InviteInput) => {
      const bureauPrefix = input.bureau ? input.bureau.replace(/[^A-Z]/gi, "").slice(0, 3).toUpperCase() : "GEN";
      const rolePrefix = input.role.slice(0, 3).toUpperCase();
      const next: InviteCode = {
        id: stampId("inv"),
        code: `${bureauPrefix}-${rolePrefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        role: input.role,
        bureau: input.role === "mainboard" ? undefined : input.bureau,
        expiresAt: input.expiresAt,
        createdAt: new Date().toISOString(),
        isUsed: false
      };

      setInviteCodes((items) => [next, ...items]);
      recordAuditLog({
        action: "Generated invite code",
        table: "invite_codes",
        recordId: next.id,
        details: `${next.code} created for ${next.role}${next.bureau ? ` / ${next.bureau}` : ""}.`
      });
      return next;
    };

    const redeemInviteCode = (code: string, usedBy: string) => {
      const normalized = code.trim().toUpperCase();
      const invite = inviteCodes.find((item) => item.code.toUpperCase() === normalized);
      if (!invite || (invite.isUsed && !invite.isReusable)) return undefined;

      setInviteCodes((items) =>
        items.map((item) =>
          item.id === invite.id
            ? {
                ...item,
                isUsed: item.isReusable ? item.isUsed : true,
                usedBy
              }
            : item
        )
      );
      recordAuditLog({
        action: "Redeemed invite code",
        table: "invite_codes",
        recordId: invite.id,
        details: `${usedBy} redeemed ${invite.code}.`
      });
      return invite;
    };

    const createAnnouncement = (input: AnnouncementInput) => {
      const next: Announcement = {
        id: stampId("ann"),
        ...input,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      setAnnouncements((items) => [next, ...items]);
      recordAuditLog({
        action: "Created announcement",
        table: "announcements",
        recordId: next.id,
        details: `${input.type === "emergency" ? "EMERGENCY: " : ""}${input.title}`
      });
      return next;
    };

    const dismissAnnouncement = (id: string, userId: string) => {
      setAnnouncements((items) =>
        items.map((item) =>
          item.id === id
            ? { ...item, dismissedBy: [...(item.dismissedBy || []), userId] }
            : item
        )
      );
    };

    const deactivateAnnouncement = (id: string) => {
      setAnnouncements((items) => items.map((item) => (item.id === id ? { ...item, isActive: false } : item)));
      recordAuditLog({
        action: "Deactivated announcement",
        table: "announcements",
        recordId: id,
        details: "Announcement was deactivated."
      });
    };

    return {
      schedule,
      reports,
      tasks,
      attendanceProofs,
      bureauOperations,
      banners,
      notifications,
      inviteCodes,
      auditLog,
      announcements,
      updateReadiness,
      updateScheduleItem,
      createScheduleItem,
      deleteScheduleItem,
      addReport,
      updateReportStatus,
      updateTaskStatus,
      addTask,
      submitAttendanceProof,
      reviewAttendanceProof,
      updateBureauOperationStatus,
      sendBureauOperationAlert,
      dismissBanner,
      deactivateBanner,
      createEmergencyBroadcast,
      sendGlobalNotification,
      generateInviteCode,
      redeemInviteCode,
      recordAuditLog,
      createAnnouncement,
      dismissAnnouncement,
      deactivateAnnouncement
    };},
    [attendanceProofs, auditLog, banners, bureauOperations, inviteCodes, notifications, reports, schedule, tasks, announcements, user]
  );

  return <MockDataContext.Provider value={value}>{children}</MockDataContext.Provider>;
}

export function useMockData() {
  const context = useContext(MockDataContext);
  if (!context) {
    throw new Error("useMockData must be used inside MockDataProvider");
  }
  return context;
}
