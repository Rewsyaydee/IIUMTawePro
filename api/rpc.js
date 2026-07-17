import { readJson, sendJson } from "./_lib/auth-utils.js";
import { createAuditLog, getUserById, supabaseRequest } from "./_lib/supabase.js";
import { verifyAppSessionFromRequest } from "./_lib/auth-utils.js";

import { insertReport, listReportsForUser, mapWellbeingReport, updateReportStatus, validateReportInput } from "./_lib/wellbeing-utils.js";
import { insertTask, listTasksForUser, mapPoaTask, updateTaskStatus } from "./_lib/tasks-utils.js";
import { listOperationsForUser, mapBureauOperation, updateOperationStatus } from "./_lib/bureau-ops-utils.js";
import { broadcastToTargets } from "./_lib/telegram-bot.js";

const SCHEDULE_SELECT = "id,date,day,week,scheduled_start_time,scheduled_end_time,title,venue,tag,audience,description,is_live,notify_minutes_before,responsible_bureau,readiness_status,pre_session_tasks,venue_code";

function mapBannerRow(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    type: row.type,
    isActive: row.is_active,
    createdAt: row.created_at,
    expiresAt: row.expires_at || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    links: Array.isArray(row.links) ? row.links : []
  };
}

function mapAuditRow(row) {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    table: row.table_name,
    recordId: row.record_id || undefined,
    details: row.details,
    timestamp: row.timestamp
  };
}

function mapStudentAttendance(row) {
  return {
    id: row.id,
    userId: row.user_id,
    scheduleItemId: row.schedule_item_id,
    eventTitle: row.event_title,
    studentName: row.student_name,
    matricNumber: row.matric_number,
    kulliyyah: row.kulliyyah || undefined,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    excuse: row.excuse || undefined,
    submittedAt: row.submitted_at,
    reviewedBy: row.reviewed_by || undefined,
    reviewedAt: row.reviewed_at || undefined
  };
}

function mapScheduleItem(row) {
  return {
    id: row.id,
    date: row.date,
    day: row.day,
    week: row.week,
    scheduledStartTime: row.scheduled_start_time,
    scheduledEndTime: row.scheduled_end_time,
    title: row.title,
    venue: row.venue,
    tag: row.tag,
    audience: row.audience,
    description: row.description || undefined,
    isLive: row.is_live,
    notifyMinutesBefore: row.notify_minutes_before,
    responsibleBureau: row.responsible_bureau || undefined,
    readinessStatus: row.readiness_status,
    preSessionTasks: Array.isArray(row.pre_session_tasks) ? row.pre_session_tasks : [],
    venueCode: row.venue_code || undefined
  };
}

async function resolveUser(req) {
  const session = verifyAppSessionFromRequest(req);
  if (!session.ok) return null;
  return getUserById(session.claims.app_user_id);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "POST only." });
  }

  let body;
  try { body = await readJson(req); } catch {
    return sendJson(res, 400, { error: "Invalid JSON body." });
  }

  const { action } = body;
  if (!action) return sendJson(res, 400, { error: "Missing action field." });

  const publicActions = new Set(["schedule.list", "announcements.list"]);
  let user;
  if (!publicActions.has(action)) {
    user = await resolveUser(req);
    if (!user) return sendJson(res, 401, { error: "Invalid or expired app session." });
  }

  try {
    switch (action) {

      // ── WELLBEING ──
      case "wellbeing.list": {
        const rows = await listReportsForUser(user);
        return sendJson(res, 200, { reports: (Array.isArray(rows) ? rows : []).map(mapWellbeingReport) });
      }
      case "wellbeing.submit": {
        const err = validateReportInput(body);
        if (err) return sendJson(res, 400, { error: err });
        const row = await insertReport({ user, studentName: body.studentName.trim(), phone: body.phone.trim(), category: body.category, notes: body.notes.trim() });
        if (!row) return sendJson(res, 500, { error: "Failed to create report." });
        return sendJson(res, 201, { report: mapWellbeingReport(row) });
      }
      case "wellbeing.update": {
        if (user.bureau !== "Welfare" && user.role !== "mainboard") return sendJson(res, 403, { error: "Only Welfare bureau and mainboard can update reports." });
        if (!["responded", "resolved", "escalated"].includes(body.status)) return sendJson(res, 400, { error: "Invalid status." });
        const row = await updateReportStatus({ id: body.id, status: body.status, user });
        if (!row) return sendJson(res, 404, { error: "Report not found." });
        return sendJson(res, 200, { report: mapWellbeingReport(row) });
      }

      // ── TASKS ──
      case "tasks.list": {
        const rows = await listTasksForUser(user);
        return sendJson(res, 200, { tasks: (Array.isArray(rows) ? rows : []).map(mapPoaTask) });
      }
      case "tasks.create": {
        if (user.role !== "mainboard" && user.role !== "head") return sendJson(res, 403, { error: "Only mainboard or bureau heads can create tasks." });
        if (!body.title || !body.bureau) return sendJson(res, 400, { error: "Title and bureau are required." });
        const row = await insertTask({ user, task: body });
        if (!row) return sendJson(res, 500, { error: "Failed to create task." });
        return sendJson(res, 201, { task: mapPoaTask(row) });
      }
      case "tasks.update": {
        if (!["todo", "in_progress", "done", "blocked"].includes(body.status)) return sendJson(res, 400, { error: "Invalid status." });
        const row = await updateTaskStatus({ id: body.id, status: body.status, user });
        if (!row) return sendJson(res, 404, { error: "Task not found." });
        return sendJson(res, 200, { task: mapPoaTask(row) });
      }

      // ── BUREAU OPS ──
      case "ops.list": {
        const rows = await listOperationsForUser(user);
        return sendJson(res, 200, { operations: (Array.isArray(rows) ? rows : []).map(mapBureauOperation) });
      }
      case "ops.update": {
        if (!["pending", "active", "ready", "issue", "done"].includes(body.status)) return sendJson(res, 400, { error: "Invalid status." });
        const row = await updateOperationStatus({ id: body.id, status: body.status, user });
        if (!row) return sendJson(res, 404, { error: "Operation not found." });
        return sendJson(res, 200, { operation: mapBureauOperation(row) });
      }

      // ── NOTIFICATIONS ──
      case "notify.send": {
        if (user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.title || !body.body) return sendJson(res, 400, { error: "Title and body are required." });
        const text = `<b>${body.title}</b>\n\n${body.body}`;
        const { sent, failed, queued } = await broadcastToTargets({ targetRole: body.targetRole || "all", targetBureau: body.targetBureau || "all", text });
        if (body.createBanner) {
          await supabaseRequest("/banners", { method: "POST", headers: { Prefer: "return=minimal" }, body: [{ title: body.title, body: body.body, type: "info", is_active: true }] });
        }
        await createAuditLog({ actor: user, action: "sent_official_notice", tableName: "notifications", recordId: "", details: `Notice "${body.title}" sent to ${queued} users (${sent} delivered, ${failed} failed).` });
        return sendJson(res, 200, { queued, sent, failed });
      }
      case "notify.emergency": {
        if (user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.title || !body.body) return sendJson(res, 400, { error: "Title and body are required." });
        const text = `\u{1F6A8} <b>EMERGENCY</b>\n\n<b>${body.title}</b>\n\n${body.body}`;
        const { sent, failed, queued } = await broadcastToTargets({ targetRole: body.targetRole || "all", targetBureau: body.targetBureau || "all", text });
        await createAuditLog({ actor: user, action: "sent_emergency_broadcast", tableName: "banners", recordId: "", details: `EMERGENCY "${body.title}" sent to ${queued} users (${sent} delivered, ${failed} failed).` });
        return sendJson(res, 200, { queued, sent, failed });
      }

      // ── SCHEDULE ──
      case "schedule.list": {
        const rows = await supabaseRequest(`/schedule_items?select=${SCHEDULE_SELECT}&order=date.asc,scheduled_start_time.asc`);
        return sendJson(res, 200, { items: (Array.isArray(rows) ? rows : []).map(mapScheduleItem) });
      }
      case "schedule.create": {
        if (user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.title || !body.date || !body.scheduledStartTime || !body.scheduledEndTime) return sendJson(res, 400, { error: "Title, date, start and end time are required." });
        const rows = await supabaseRequest(`/schedule_items?select=${SCHEDULE_SELECT}`, { method: "POST", headers: { Prefer: "return=representation" }, body: [{ date: body.date, day: body.day || "", week: body.week || "event_week", scheduled_start_time: body.scheduledStartTime, scheduled_end_time: body.scheduledEndTime, title: body.title, venue: body.venue || "TBC", tag: body.tag || "Programme", audience: body.audience || "All", description: body.description || null, is_live: false, notify_minutes_before: body.notifyMinutesBefore || 30, responsible_bureau: body.responsibleBureau || null, readiness_status: "pending", pre_session_tasks: JSON.stringify(body.preSessionTasks || []), venue_code: body.venueCode || null }] });
        const item = Array.isArray(rows) ? rows[0] : undefined;
        if (!item) return sendJson(res, 500, { error: "Failed to create schedule item." });
        await createAuditLog({ actor: user, action: "created_schedule_item", tableName: "schedule_items", recordId: item.id, details: `Schedule item "${item.title}" created for ${item.date}.` });
        return sendJson(res, 201, { item: mapScheduleItem(item) });
      }
      case "schedule.publish": {
        if (user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.id) return sendJson(res, 400, { error: "Schedule item ID is required." });
        const patch = {};
        if (typeof body.isLive === "boolean") patch.is_live = body.isLive;
        if (body.readinessStatus) patch.readiness_status = body.readinessStatus;
        if (Object.keys(patch).length === 0) return sendJson(res, 400, { error: "No update fields provided." });
        patch.updated_at = new Date().toISOString();
        const rows = await supabaseRequest(`/schedule_items?id=eq.${encodeURIComponent(body.id)}&select=${SCHEDULE_SELECT}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: patch });
        const item = Array.isArray(rows) ? rows[0] : undefined;
        if (!item) return sendJson(res, 404, { error: "Schedule item not found." });
        await createAuditLog({ actor: user, action: body.isLive ? "published_schedule_item" : "updated_schedule_item", tableName: "schedule_items", recordId: body.id, details: `Schedule item "${item.title}" ${body.isLive ? "published" : "updated"}.` });
        return sendJson(res, 200, { item: mapScheduleItem(item) });
      }
      case "schedule.update": {
        if (user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.id) return sendJson(res, 400, { error: "Schedule item ID is required." });
        const patch = { updated_at: new Date().toISOString() };
        if (body.title !== undefined) patch.title = body.title;
        if (body.venue !== undefined) patch.venue = body.venue;
        if (body.venueCode !== undefined) patch.venue_code = body.venueCode || null;
        if (body.date !== undefined) patch.date = body.date;
        if (body.day !== undefined) patch.day = body.day;
        if (body.week !== undefined) patch.week = body.week;
        if (body.scheduledStartTime !== undefined) patch.scheduled_start_time = body.scheduledStartTime;
        if (body.scheduledEndTime !== undefined) patch.scheduled_end_time = body.scheduledEndTime;
        if (body.tag !== undefined) patch.tag = body.tag;
        if (body.audience !== undefined) patch.audience = body.audience;
        if (body.description !== undefined) patch.description = body.description;
        if (body.notifyMinutesBefore !== undefined) patch.notify_minutes_before = Number(body.notifyMinutesBefore) || 30;
        if (body.responsibleBureau !== undefined) patch.responsible_bureau = body.responsibleBureau;
        if (body.preSessionTasks !== undefined) patch.pre_session_tasks = JSON.stringify(body.preSessionTasks);
        const rows = await supabaseRequest(`/schedule_items?id=eq.${encodeURIComponent(body.id)}&select=${SCHEDULE_SELECT}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: patch });
        const item = Array.isArray(rows) ? rows[0] : undefined;
        if (!item) return sendJson(res, 404, { error: "Schedule item not found." });
        await createAuditLog({ actor: user, action: "updated_schedule_item", tableName: "schedule_items", recordId: body.id, details: `Schedule item "${item.title}" updated.` });
        return sendJson(res, 200, { item: mapScheduleItem(item) });
      }

      // ── BUREAU OPS ALERT ──
      case "ops.alert": {
        const opRows = await supabaseRequest(`/bureau_operations?id=eq.${encodeURIComponent(body.id)}&select=id,bureau,title,metric&limit=1`);
        const operation = Array.isArray(opRows) ? opRows[0] : undefined;
        if (!operation) return sendJson(res, 404, { error: "Operation not found." });

        if (user.role !== "mainboard" && user.bureau !== operation.bureau) {
          return sendJson(res, 403, { error: "You can only alert your own bureau." });
        }

        const alertText = `<b>${operation.bureau} Update</b>\n\n<b>${operation.title}</b>: ${operation.metric}\n\n${body.message || "Please check the operations board."}`;
        const { sent, failed, queued } = await broadcastToTargets({ targetRole: "committee", targetBureau: operation.bureau, text: alertText });

        await createAuditLog({ actor: user, action: "sent_bureau_alert", tableName: "bureau_operations", recordId: operation.id, details: `Alert sent to ${operation.bureau} (${sent} delivered, ${failed} failed).` });

        return sendJson(res, 200, { sent, failed, queued });
      }

      // ── ANNOUNCEMENTS ──
      case "announcements.list": {
        const rows = await supabaseRequest("/banners?select=id,title,body,type,is_active,created_at,expires_at,tags,links&order=created_at.desc");
        const items = (Array.isArray(rows) ? rows : []).map(mapBannerRow);
        return sendJson(res, 200, { items });
      }
      case "announcements.create": {
        if (!user || user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.title || !body.body) return sendJson(res, 400, { error: "Title and body are required." });
        const tags = Array.isArray(body.tags) ? body.tags : typeof body.tags === "string" ? String(body.tags).split(",").map((t) => t.trim()).filter(Boolean) : [];
        const links = Array.isArray(body.links) ? body.links : [];
        const rows = await supabaseRequest("/banners?select=id,title,body,type,is_active,created_at,expires_at,tags,links", { method: "POST", headers: { Prefer: "return=representation" }, body: [{ title: body.title, body: body.body, type: body.type || "info", is_active: true, tags, links }] });
        const item = Array.isArray(rows) ? rows[0] : undefined;
        if (!item) return sendJson(res, 500, { error: "Failed to create announcement." });
        await createAuditLog({ actor: user, action: "created_announcement", tableName: "banners", recordId: item.id, details: `Announcement "${item.title}" created.` });
        return sendJson(res, 201, { item: mapBannerRow(item) });
      }
      case "announcements.deactivate": {
        if (!user || user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.id) return sendJson(res, 400, { error: "Announcement ID is required." });
        const rows = await supabaseRequest(`/banners?id=eq.${encodeURIComponent(body.id)}&select=id,title,body,type,is_active,created_at,expires_at,tags,links`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: { is_active: false } });
        const item = Array.isArray(rows) ? rows[0] : undefined;
        if (!item) return sendJson(res, 404, { error: "Announcement not found." });
        await createAuditLog({ actor: user, action: "deactivated_announcement", tableName: "banners", recordId: body.id, details: `Announcement "${item.title}" deactivated.` });
        return sendJson(res, 200, { item: mapBannerRow(item) });
      }

      // ── AUDIT ──
      case "audit.list": {
        if (!user || user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        const rows = await supabaseRequest("/audit_log?select=id,actor_id,actor_name,action,table_name,record_id,details,timestamp&order=timestamp.desc&limit=100");
        const items = (Array.isArray(rows) ? rows : []).map(mapAuditRow);
        return sendJson(res, 200, { items });
      }

      // ── USER MANAGEMENT (Mainboard only) ──
      case "users.list": {
        if (!user || user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        const rows = await supabaseRequest("/users?select=id,telegram_id,name,role,bureau,status,matric_number,kulliyyah,registration_step&order=name.asc");
        return sendJson(res, 200, { users: Array.isArray(rows) ? rows : [] });
      }
      case "users.update": {
        if (!user || user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.id) return sendJson(res, 400, { error: "User ID is required." });
        const patch = { updated_at: new Date().toISOString() };
        if (body.role !== undefined) patch.role = body.role;
        if (body.bureau !== undefined) patch.bureau = body.bureau || null;
        const rows = await supabaseRequest(`/users?id=eq.${encodeURIComponent(body.id)}&select=id,telegram_id,name,role,bureau,status,matric_number,kulliyyah,registration_step`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: patch });
        const record = Array.isArray(rows) ? rows[0] : undefined;
        if (!record) return sendJson(res, 404, { error: "User not found." });
        await createAuditLog({ actor: user, action: "updated_user", tableName: "users", recordId: body.id, details: `User role/bureau updated.` });
        return sendJson(res, 200, { user: record });
      }
      case "users.revoke": {
        if (!user || user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.id) return sendJson(res, 400, { error: "User ID is required." });
        const rows = await supabaseRequest(`/users?id=eq.${encodeURIComponent(body.id)}&select=id,telegram_id,name,role,bureau,status`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: { status: "revoked", updated_at: new Date().toISOString() } });
        const record = Array.isArray(rows) ? rows[0] : undefined;
        if (!record) return sendJson(res, 404, { error: "User not found." });
        await createAuditLog({ actor: user, action: "revoked_user", tableName: "users", recordId: body.id, details: `User "${record.name}" revoked.` });
        return sendJson(res, 200, { user: record });
      }

      // ── STUDENT ATTENDANCE ──
      case "user.onboard": {
        if (!user || user.role !== "student") return sendJson(res, 403, { error: "Students only." });
        if (!body.matricNumber) return sendJson(res, 400, { error: "Matric number is required." });
        await supabaseRequest(`/users?id=eq.${encodeURIComponent(user.id)}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: { matric_number: String(body.matricNumber).trim(), kulliyyah: body.kulliyyah || null }
        });
        return sendJson(res, 200, { onboarded: true });
      }
      case "attendance.submit": {
        if (!user || user.role !== "student") return sendJson(res, 403, { error: "Students only." });
        if (!body.scheduleItemId || !body.latitude || !body.longitude) return sendJson(res, 400, { error: "Event ID and location are required." });
        const rows = await supabaseRequest("/student_attendance?select=id,user_id,schedule_item_id,status", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: [{
            user_id: user.id,
            schedule_item_id: body.scheduleItemId,
            event_title: body.eventTitle || "",
            student_name: body.studentName || user.name,
            matric_number: body.matricNumber || "",
            kulliyyah: body.kulliyyah || null,
            latitude: body.latitude,
            longitude: body.longitude,
            status: body.status || "present",
            excuse: body.excuse || null
          }]
        });
        const record = Array.isArray(rows) ? rows[0] : undefined;
        if (!record) return sendJson(res, 500, { error: "Failed to submit attendance." });
        return sendJson(res, 201, { attendance: mapStudentAttendance(record) });
      }
      case "attendance.student.list": {
        if (!user) return sendJson(res, 401);
        const rows = await supabaseRequest(`/student_attendance?user_id=eq.${encodeURIComponent(user.id)}&order=submitted_at.desc`);
        return sendJson(res, 200, { attendances: (Array.isArray(rows) ? rows : []).map(mapStudentAttendance) });
      }
      case "attendance.mainboard.list": {
        if (!user || user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        const rows = await supabaseRequest("/student_attendance?select=*&order=submitted_at.desc&limit=200");
        return sendJson(res, 200, { attendances: (Array.isArray(rows) ? rows : []).map(mapStudentAttendance) });
      }
      case "attendance.review": {
        if (!user || user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.id || !body.status) return sendJson(res, 400, { error: "ID and status are required." });
        const rows = await supabaseRequest(`/student_attendance?id=eq.${encodeURIComponent(body.id)}`, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: { status: body.status, reviewed_by: user.id, reviewed_at: new Date().toISOString() }
        });
        const record = Array.isArray(rows) ? rows[0] : undefined;
        if (!record) return sendJson(res, 404, { error: "Attendance record not found." });
        return sendJson(res, 200, { attendance: mapStudentAttendance(record) });
      }

      default:
        return sendJson(res, 400, { error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error(`RPC action "${action}" failed`, error);
    return sendJson(res, 500, { error: "Internal server error." });
  }
}
