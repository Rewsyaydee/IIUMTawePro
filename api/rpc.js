import { readJson, sendJson, ROLES, BUREAUS } from "./_lib/auth-utils.js";
import { createAuditLog, getUserById, getUserRecordByTelegramId, SupabaseRequestError, supabaseRequest } from "./_lib/supabase.js";
import { verifyAppSessionFromRequest } from "./_lib/auth-utils.js";

import { insertReport, listReportsForUser, mapWellbeingReport, updateReportStatus, validateReportInput } from "./_lib/wellbeing-utils.js";
import { dispatchTaskNotifications, insertTask, listTasksForUser, mapPoaTask, updateTaskStatus, updateTaskDetails, deleteTaskRecord } from "./_lib/tasks-utils.js";
import { listOperationsForUser, mapBureauOperation, updateOperationStatus } from "./_lib/bureau-ops-utils.js";
import { broadcastToTargets } from "./_lib/telegram-bot.js";
import { buildBlockId, formatIsoDate, getActiveSessionWindow, getLoopCycleKey, getSessionDelayMinutes, getVirtualScheduleDate, parseBlockId } from "./_lib/schedule-utils.js";

const SCHEDULE_SELECT = "id,date,day,week,scheduled_start_time,scheduled_end_time,title,venue,tag,audience,description,is_live,notify_minutes_before,responsible_bureau,readiness_status,pre_session_tasks,venue_code,block,block_group,is_concurrent,is_attendance_required,track,program_count";

// ── Simple in-memory cache for high-traffic public endpoints ──
const CACHE_TTL_MS = 30000; // 30 seconds
const cache = {};
function getCached(key) {
  const entry = cache[key];
  if (entry && (Date.now() - entry.timestamp) < CACHE_TTL_MS) {
    return entry.value;
  }
  delete cache[key];
  return undefined;
}
function setCache(key, value) {
  cache[key] = { value, timestamp: Date.now() };
}

// ── Rate limiter (per-IP, per-user) ──
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "60", 10); // configurable via env
const rateLimitMap = {};
function checkRateLimit(key) {
  const now = Date.now();
  const entry = rateLimitMap[key];
  if (!entry || (now - entry.windowStart) > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap[key] = { windowStart: now, count: 1 };
    return true;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return false;
  return true;
}
// Periodic cleanup of stale rate limit entries
const RATE_LIMIT_CLEANUP_MS = 300000; // 5 minutes
let lastCleanup = 0;
function cleanupRateLimits() {
  const now = Date.now();
  if (now - lastCleanup < RATE_LIMIT_CLEANUP_MS) return;
  lastCleanup = now;
  for (const key of Object.keys(rateLimitMap)) {
    if ((now - rateLimitMap[key].windowStart) > RATE_LIMIT_WINDOW_MS * 2) {
      delete rateLimitMap[key];
    }
  }
}

function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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

function mapEmergencyContact(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    phone: row.phone,
    priority: Boolean(row.priority),
    sortOrder: row.sort_order
  };
}

function mapCouponLocation(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    accepts: row.accepts,
    hours: row.hours,
    sortOrder: row.sort_order
  };
}

function mapLaunchItem(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    owner: row.owner,
    status: row.status,
    sortOrder: row.sort_order,
    updatedBy: row.updated_by || undefined,
    updatedAt: row.updated_at
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
    venueCode: row.venue_code || undefined,
    block: row.block || undefined,
    blockGroup: row.block_group || undefined,
    isConcurrent: Boolean(row.is_concurrent),
    isAttendanceRequired: Boolean(row.is_attendance_required),
    track: row.track || undefined,
    programCount: row.program_count
  };
}

async function resolveUser(req) {
  const session = verifyAppSessionFromRequest(req);
  if (!session.ok) return null;

  // Stress test mode: resolve by telegram_id from JWT claims (DB users were seeded)
  if (process.env.STRESS_TEST_MODE === "true") {
    const telegramId = session.claims.telegram_id;
    if (telegramId) {
      const record = await getUserRecordByTelegramId(telegramId);
      if (record && record.status === "active") {
        return {
          id: record.id,
          telegramId: record.telegram_id,
          name: record.name,
          role: record.role,
          bureau: record.bureau || undefined,
          matricNumber: record.matric_number || undefined,
          kulliyyah: record.kulliyyah || undefined,
        };
      }
    }
    return null;
  }

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

  // Rate limiting: check per-IP and per-user
  // Use Vercel-trusted headers: x-real-ip is set by Vercel edge (not client-spoofable)
  cleanupRateLimits();
  const clientIp = req.headers["x-real-ip"] || req.headers["x-vercel-forwarded-for"] || req.headers["x-forwarded-for"] || "unknown";
  if (!checkRateLimit(`ip:${clientIp}`)) {
    return sendJson(res, 429, { error: "Too many requests. Please slow down." });
  }

  const publicActions = new Set(["schedule.list", "announcements.list", "leaderboard.fetch"]);
  let user;
  if (!publicActions.has(action)) {
    user = await resolveUser(req);
    if (!user) return sendJson(res, 401, { error: "Invalid or expired app session." });
    // User-level rate limit
    if (!checkRateLimit(`user:${user.id}`)) {
      return sendJson(res, 429, { error: "Too many requests. Please slow down." });
    }
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
        const row = await insertReport({ user, studentName: body.studentName.trim(), phone: body.phone.trim(), category: body.category, notes: body.notes.trim(), medicalConditions: body.medicalConditions });
        if (!row) return sendJson(res, 500, { error: "Failed to create report." });

        // Persist phone for future form prefill (best-effort, non-blocking)
        supabaseRequest(`/users?id=eq.${encodeURIComponent(user.id)}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: { phone: body.phone.trim(), updated_at: new Date().toISOString() }
        }).catch(() => {});

        // Instant alert to Welfare bureau (committee members + head) — fire-and-forget
        const conditions = Array.isArray(row.medical_conditions) && row.medical_conditions.length > 0
          ? `\n🏥 ${row.medical_conditions.map((c) => escapeHtml(c)).join(", ")}`
          : "";
        const welfareText = `🆘 <b>New Wellbeing Report</b>\n\n<b>${escapeHtml(row.reference)}</b>\n👤 ${escapeHtml(row.student_name)}\n🏷️ ${escapeHtml(row.category)}${conditions}\n📝 ${escapeHtml(String(row.notes || "").slice(0, 140))}\n\n👉 Open TawePro to respond: t.me/iiumtaweprobot`;
        broadcastToTargets({ targetBureau: "Welfare", text: welfareText }).catch(() => {});

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
        // Notify assigned committee members via the Telegram bot (fire-and-forget with dispatch log)
        try {
          const dispatch = await dispatchTaskNotifications({ task: row, assigneeIds: body.assignedToIds });
          await createAuditLog({ actor: user, action: "notified_task_assignees", tableName: "task_notifications", recordId: row.id, details: `Task "${row.title}": ${dispatch.sent} DMs sent, ${dispatch.failed} failed.` });
        } catch (error) {
          console.error("Task notification dispatch failed", error?.message || error);
        }
        return sendJson(res, 201, { task: mapPoaTask(row) });
      }
      case "tasks.update": {
        if (!user || (user.role !== "mainboard" && user.role !== "head" && user.role !== "committee")) return sendJson(res, 403, { error: "Mainboard, head or committee only." });
        if (!["todo", "in_progress", "done", "blocked"].includes(body.status)) return sendJson(res, 400, { error: "Invalid status." });
        const row = await updateTaskStatus({ id: body.id, status: body.status, user });
        if (!row) return sendJson(res, 404, { error: "Task not found." });
        return sendJson(res, 200, { task: mapPoaTask(row) });
      }
      case "tasks.edit": {
        if (!user || (user.role !== "mainboard" && user.role !== "head")) return sendJson(res, 403, { error: "Mainboard or head only." });
        if (!body.id) return sendJson(res, 400, { error: "Task ID is required." });
        let previousAssignees = [];
        try {
          const existing = await supabaseRequest(`/poa_tasks?id=eq.${encodeURIComponent(body.id)}&select=assigned_to_ids&limit=1`);
          previousAssignees = Array.isArray(existing) && Array.isArray(existing[0]?.assigned_to_ids) ? existing[0].assigned_to_ids : [];
        } catch { /* ignore — notification is best-effort */ }
        const row = await updateTaskDetails({ id: body.id, fields: body, user });
        if (!row) return sendJson(res, 404, { error: "Task not found." });
        // DM only newly added assignees when the assignee list changes
        const newAssignees = (Array.isArray(body.assignedToIds) ? body.assignedToIds : []).filter((id) => !previousAssignees.includes(id));
        if (newAssignees.length > 0) {
          try {
            const dispatch = await dispatchTaskNotifications({ task: row, assigneeIds: newAssignees });
            await createAuditLog({ actor: user, action: "notified_task_assignees", tableName: "task_notifications", recordId: row.id, details: `Task "${row.title}": ${dispatch.sent} DMs sent to new assignees, ${dispatch.failed} failed.` });
          } catch (error) {
            console.error("Task notification dispatch failed", error?.message || error);
          }
        }
        return sendJson(res, 200, { task: mapPoaTask(row) });
      }
      case "tasks.delete": {
        if (!user || (user.role !== "mainboard" && user.role !== "head")) return sendJson(res, 403, { error: "Mainboard or head only." });
        if (!body.id) return sendJson(res, 400, { error: "Task ID is required." });
        await deleteTaskRecord({ id: body.id, user });
        return sendJson(res, 200, { deleted: true });
      }

      // ── BUREAU MEMBERS ──
      case "bureau.members": {
        const bureau = body.bureau || user.bureau;
        if (!bureau) return sendJson(res, 400, { error: "Bureau is required." });
        if (user.role !== "mainboard" && user.bureau !== bureau) {
          return sendJson(res, 403, { error: "You can only view your own bureau." });
        }
        const rows = await supabaseRequest(`/users?bureau=eq.${encodeURIComponent(bureau)}&status=eq.active&select=id,name,matric_number,telegram_username,role,photo_url&order=name.asc`);
        return sendJson(res, 200, { members: Array.isArray(rows) ? rows : [] });
      }

      // ── BUREAU OPS ──
      case "ops.list": {
        const rows = await listOperationsForUser(user);
        return sendJson(res, 200, { operations: (Array.isArray(rows) ? rows : []).map(mapBureauOperation) });
      }
      case "ops.update": {
        if (user.role !== "mainboard" && user.role !== "head" && user.role !== "committee") return sendJson(res, 403, { error: "Mainboard, head or committee only." });
        if (!["pending", "active", "ready", "issue", "done"].includes(body.status)) return sendJson(res, 400, { error: "Invalid status." });
        const row = await updateOperationStatus({ id: body.id, status: body.status, user });
        if (!row) return sendJson(res, 404, { error: "Operation not found." });
        return sendJson(res, 200, { operation: mapBureauOperation(row) });
      }

      // ── NOTIFICATIONS ──
      case "notify.send": {
        if (user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.title || !body.body) return sendJson(res, 400, { error: "Title and body are required." });
        const text = `<b>${escapeHtml(body.title)}</b>\n\n${escapeHtml(body.body)}`;

        // Create banner first (fast)
        if (body.createBanner) {
          await supabaseRequest("/banners", { method: "POST", headers: { Prefer: "return=minimal" }, body: [{ title: body.title, body: body.body, type: "info", is_active: true }] });
        }

        // Start broadcast - this may take time with large audiences
        const { sent, failed, queued } = await broadcastToTargets({ targetRole: body.targetRole || "all", targetBureau: body.targetBureau || "all", text });

        await createAuditLog({ actor: user, action: "sent_official_notice", tableName: "notifications", recordId: "", details: `Notice "${body.title}" sent to ${queued} users (${sent} delivered, ${failed} failed).` });
        return sendJson(res, 200, { queued, sent, failed });
      }
      case "notify.emergency": {
        if (user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.title || !body.body) return sendJson(res, 400, { error: "Title and body are required." });
        const text = `\u{1F6A8} <b>EMERGENCY</b>\n\n<b>${escapeHtml(body.title)}</b>\n\n${escapeHtml(body.body)}`;
        const { sent, failed, queued } = await broadcastToTargets({ targetRole: body.targetRole || "all", targetBureau: body.targetBureau || "all", text });
        await createAuditLog({ actor: user, action: "sent_emergency_broadcast", tableName: "banners", recordId: "", details: `EMERGENCY "${body.title}" sent to ${queued} users (${sent} delivered, ${failed} failed).` });
        return sendJson(res, 200, { queued, sent, failed });
      }

      // ── SCHEDULE ──
      case "schedule.list": {
        const cached = getCached("schedule.list");
        if (cached) return sendJson(res, 200, { items: cached, cached: true });
        const rows = await supabaseRequest(`/schedule_items?select=${SCHEDULE_SELECT}&order=date.asc,scheduled_start_time.asc`);
        const items = (Array.isArray(rows) ? rows : []).map(mapScheduleItem);
        setCache("schedule.list", items);
        return sendJson(res, 200, { items });
      }
      case "schedule.create": {
        if (user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.title || !body.date || !body.scheduledStartTime || !body.scheduledEndTime) return sendJson(res, 400, { error: "Title, date, start and end time are required." });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return sendJson(res, 400, { error: "Invalid date format. Use YYYY-MM-DD." });
        if (!["preparation", "event_week"].includes(body.week)) body.week = "event_week";
        const rows = await supabaseRequest(`/schedule_items?select=${SCHEDULE_SELECT}`, { method: "POST", headers: { Prefer: "return=representation" }, body: [{ date: body.date, day: body.day || "", week: body.week || "event_week", scheduled_start_time: body.scheduledStartTime, scheduled_end_time: body.scheduledEndTime, title: body.title, venue: body.venue || "TBC", tag: body.tag || "Programme", audience: body.audience || "All", description: body.description || null, is_live: false, notify_minutes_before: body.notifyMinutesBefore || 30, responsible_bureau: body.responsibleBureau || null, readiness_status: "pending", pre_session_tasks: JSON.stringify(body.preSessionTasks || []), venue_code: body.venueCode || null, block: body.block || null, block_group: body.blockGroup || null, is_concurrent: Boolean(body.isConcurrent), is_attendance_required: Boolean(body.isAttendanceRequired), track: body.track || null, program_count: Number(body.programCount) || 1 }] });
        const item = Array.isArray(rows) ? rows[0] : undefined;
        if (!item) return sendJson(res, 500, { error: "Failed to create schedule item." });
        await createAuditLog({ actor: user, action: "created_schedule_item", tableName: "schedule_items", recordId: item.id, details: `Schedule item "${item.title}" created for ${item.date}.` });
        setCache("schedule.list", undefined);
        return sendJson(res, 201, { item: mapScheduleItem(item) });
      }
      case "schedule.publish": {
        if (user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.id) return sendJson(res, 400, { error: "Schedule item ID is required." });
        const patch = {};
        if (typeof body.isLive === "boolean") patch.is_live = body.isLive;
        if (body.readinessStatus) {
          if (!["pending", "ready", "issues"].includes(body.readinessStatus)) return sendJson(res, 400, { error: "Invalid readiness status. Use pending, ready, or issues." });
          patch.readiness_status = body.readinessStatus;
        }
        if (Object.keys(patch).length === 0) return sendJson(res, 400, { error: "No update fields provided." });
        patch.updated_at = new Date().toISOString();
        const rows = await supabaseRequest(`/schedule_items?id=eq.${encodeURIComponent(body.id)}&select=${SCHEDULE_SELECT}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: patch });
        const item = Array.isArray(rows) ? rows[0] : undefined;
        if (!item) return sendJson(res, 404, { error: "Schedule item not found." });
        await createAuditLog({ actor: user, action: body.isLive ? "published_schedule_item" : "updated_schedule_item", tableName: "schedule_items", recordId: body.id, details: `Schedule item "${item.title}" ${body.isLive ? "published" : "updated"}.` });
        setCache("schedule.list", undefined);
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
        if (body.block !== undefined) patch.block = body.block || null;
        if (body.blockGroup !== undefined) patch.block_group = body.blockGroup || null;
        if (body.isConcurrent !== undefined) patch.is_concurrent = Boolean(body.isConcurrent);
        if (body.isAttendanceRequired !== undefined) patch.is_attendance_required = Boolean(body.isAttendanceRequired);
        if (body.track !== undefined) patch.track = body.track || null;
        if (body.programCount !== undefined) patch.program_count = Number(body.programCount) || 1;
        const rows = await supabaseRequest(`/schedule_items?id=eq.${encodeURIComponent(body.id)}&select=${SCHEDULE_SELECT}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: patch });
        const item = Array.isArray(rows) ? rows[0] : undefined;
        if (!item) return sendJson(res, 404, { error: "Schedule item not found." });
        await createAuditLog({ actor: user, action: "updated_schedule_item", tableName: "schedule_items", recordId: body.id, details: `Schedule item "${item.title}" updated.` });
        setCache("schedule.list", undefined);
        return sendJson(res, 200, { item: mapScheduleItem(item) });
      }

      case "schedule.delete": {
        if (user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.id) return sendJson(res, 400, { error: "Schedule item ID is required." });
        const existing = await supabaseRequest(`/schedule_items?id=eq.${encodeURIComponent(body.id)}&select=title&limit=1`);
        const title = (Array.isArray(existing) ? existing[0]?.title : undefined) || "Unknown";
        await supabaseRequest(`/schedule_items?id=eq.${encodeURIComponent(body.id)}`, {
          method: "DELETE",
          headers: { Prefer: "return=minimal" }
        });
        await createAuditLog({ actor: user, action: "deleted_schedule_item", tableName: "schedule_items", recordId: body.id, details: `Schedule item "${title}" deleted.` });
        setCache("schedule.list", undefined);
        return sendJson(res, 200, { deleted: true });
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
        const cached = getCached("announcements.list");
        if (cached) return sendJson(res, 200, { items: cached, cached: true });
        const rows = await supabaseRequest("/banners?select=id,title,body,type,is_active,created_at,expires_at,tags,links&order=created_at.desc");
        const items = (Array.isArray(rows) ? rows : []).map(mapBannerRow);
        setCache("announcements.list", items);
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
        setCache("announcements.list", undefined); // invalidate

        // Broadcast via Telegram unless the mainboard opted out (default: ON)
        if (body.notifyTelegram !== false) {
          const text = `${item.type === "emergency" ? "🚨 " : item.type === "urgent" ? "⚠️ " : "📣 "}<b>${escapeHtml(item.title)}</b>\n\n${escapeHtml(String(item.body).slice(0, 3000))}\n\n👉 Open TawePro: t.me/iiumtaweprobot`;
          broadcastToTargets({ targetRole: "all", text }).catch(() => {});
        }

        return sendJson(res, 201, { item: mapBannerRow(item) });
      }
      case "announcements.deactivate": {
        if (!user || user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.id) return sendJson(res, 400, { error: "Announcement ID is required." });
        const rows = await supabaseRequest(`/banners?id=eq.${encodeURIComponent(body.id)}&select=id,title,body,type,is_active,created_at,expires_at,tags,links`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: { is_active: false } });
        const item = Array.isArray(rows) ? rows[0] : undefined;
        if (!item) return sendJson(res, 404, { error: "Announcement not found." });
        await createAuditLog({ actor: user, action: "deactivated_announcement", tableName: "banners", recordId: body.id, details: `Announcement "${item.title}" deactivated.` });
        setCache("announcements.list", undefined); // invalidate
        return sendJson(res, 200, { item: mapBannerRow(item) });
      }
      case "announcements.update": {
        if (!user || user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.id) return sendJson(res, 400, { error: "Announcement ID is required." });
        if (body.type !== undefined && !["info", "urgent", "emergency", "success", "warning"].includes(body.type)) return sendJson(res, 400, { error: "Invalid announcement type." });
        const patch = { updated_at: new Date().toISOString() };
        if (body.title !== undefined) patch.title = body.title;
        if (body.body !== undefined) patch.body = body.body;
        if (body.type !== undefined) patch.type = body.type;
        if (body.expiresAt !== undefined) patch.expires_at = body.expiresAt || null;
        if (body.tags !== undefined) patch.tags = Array.isArray(body.tags) ? body.tags : [];
        if (body.links !== undefined) patch.links = Array.isArray(body.links) ? body.links : [];
        const rows = await supabaseRequest(`/banners?id=eq.${encodeURIComponent(body.id)}&select=id,title,body,type,is_active,created_at,expires_at,tags,links`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: patch });
        const item = Array.isArray(rows) ? rows[0] : undefined;
        if (!item) return sendJson(res, 404, { error: "Announcement not found." });
        await createAuditLog({ actor: user, action: "updated_announcement", tableName: "banners", recordId: body.id, details: `Announcement "${item.title}" updated.` });
        setCache("announcements.list", undefined); // invalidate
        return sendJson(res, 200, { item: mapBannerRow(item) });
      }
      case "announcements.delete": {
        if (!user || user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.id) return sendJson(res, 400, { error: "Announcement ID is required." });
        const existing = await supabaseRequest(`/banners?id=eq.${encodeURIComponent(body.id)}&select=title&limit=1`);
        const title = (Array.isArray(existing) ? existing[0]?.title : undefined) || "Unknown";
        await supabaseRequest(`/banners?id=eq.${encodeURIComponent(body.id)}`, {
          method: "DELETE",
          headers: { Prefer: "return=minimal" }
        });
        await createAuditLog({ actor: user, action: "deleted_announcement", tableName: "banners", recordId: body.id, details: `Announcement "${title}" deleted.` });
        setCache("announcements.list", undefined); // invalidate
        return sendJson(res, 200, { deleted: true });
      }

      // ── GUIDES (emergency contacts + coupon locations) ──
      case "guides.emergency.list": {
        const rows = await supabaseRequest("/emergency_contacts?select=*&order=sort_order.asc");
        return sendJson(res, 200, { contacts: (Array.isArray(rows) ? rows : []).map(mapEmergencyContact) });
      }
      case "guides.emergency.create": {
        if (user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.name || !body.role || !body.phone) return sendJson(res, 400, { error: "Name, role and phone are required." });
        const rows = await supabaseRequest("/emergency_contacts?select=*", { method: "POST", headers: { Prefer: "return=representation" }, body: [{ name: body.name, role: body.role, phone: body.phone, priority: Boolean(body.priority), sort_order: Number(body.sortOrder) || 0 }] });
        const contact = Array.isArray(rows) ? rows[0] : undefined;
        if (!contact) return sendJson(res, 500, { error: "Failed to create contact." });
        await createAuditLog({ actor: user, action: "created_emergency_contact", tableName: "emergency_contacts", recordId: contact.id, details: `Emergency contact "${contact.name}" added.` });
        return sendJson(res, 201, { contact: mapEmergencyContact(contact) });
      }
      case "guides.emergency.update": {
        if (user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.id) return sendJson(res, 400, { error: "Contact ID is required." });
        const patch = { updated_at: new Date().toISOString() };
        if (body.name !== undefined) patch.name = body.name;
        if (body.role !== undefined) patch.role = body.role;
        if (body.phone !== undefined) patch.phone = body.phone;
        if (body.priority !== undefined) patch.priority = Boolean(body.priority);
        if (body.sortOrder !== undefined) patch.sort_order = Number(body.sortOrder) || 0;
        const rows = await supabaseRequest(`/emergency_contacts?id=eq.${encodeURIComponent(body.id)}&select=*`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: patch });
        const contact = Array.isArray(rows) ? rows[0] : undefined;
        if (!contact) return sendJson(res, 404, { error: "Contact not found." });
        await createAuditLog({ actor: user, action: "updated_emergency_contact", tableName: "emergency_contacts", recordId: body.id, details: `Emergency contact "${contact.name}" updated.` });
        return sendJson(res, 200, { contact: mapEmergencyContact(contact) });
      }
      case "guides.emergency.delete": {
        if (user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.id) return sendJson(res, 400, { error: "Contact ID is required." });
        const existing = await supabaseRequest(`/emergency_contacts?id=eq.${encodeURIComponent(body.id)}&select=name&limit=1`);
        const name = (Array.isArray(existing) ? existing[0]?.name : undefined) || "Unknown";
        await supabaseRequest(`/emergency_contacts?id=eq.${encodeURIComponent(body.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
        await createAuditLog({ actor: user, action: "deleted_emergency_contact", tableName: "emergency_contacts", recordId: body.id, details: `Emergency contact "${name}" deleted.` });
        return sendJson(res, 200, { deleted: true });
      }
      case "guides.coupon.list": {
        const rows = await supabaseRequest("/coupon_locations?select=*&order=sort_order.asc");
        return sendJson(res, 200, { locations: (Array.isArray(rows) ? rows : []).map(mapCouponLocation) });
      }
      case "guides.coupon.create": {
        if (user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.name || !body.location) return sendJson(res, 400, { error: "Name and location are required." });
        const rows = await supabaseRequest("/coupon_locations?select=*", { method: "POST", headers: { Prefer: "return=representation" }, body: [{ name: body.name, location: body.location, accepts: body.accepts || "All meals", hours: body.hours || "", sort_order: Number(body.sortOrder) || 0 }] });
        const location = Array.isArray(rows) ? rows[0] : undefined;
        if (!location) return sendJson(res, 500, { error: "Failed to create location." });
        await createAuditLog({ actor: user, action: "created_coupon_location", tableName: "coupon_locations", recordId: location.id, details: `Coupon location "${location.name}" added.` });
        return sendJson(res, 201, { location: mapCouponLocation(location) });
      }
      case "guides.coupon.update": {
        if (user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.id) return sendJson(res, 400, { error: "Location ID is required." });
        const patch = { updated_at: new Date().toISOString() };
        if (body.name !== undefined) patch.name = body.name;
        if (body.location !== undefined) patch.location = body.location;
        if (body.accepts !== undefined) patch.accepts = body.accepts;
        if (body.hours !== undefined) patch.hours = body.hours;
        if (body.sortOrder !== undefined) patch.sort_order = Number(body.sortOrder) || 0;
        const rows = await supabaseRequest(`/coupon_locations?id=eq.${encodeURIComponent(body.id)}&select=*`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: patch });
        const location = Array.isArray(rows) ? rows[0] : undefined;
        if (!location) return sendJson(res, 404, { error: "Location not found." });
        await createAuditLog({ actor: user, action: "updated_coupon_location", tableName: "coupon_locations", recordId: body.id, details: `Coupon location "${location.name}" updated.` });
        return sendJson(res, 200, { location: mapCouponLocation(location) });
      }
      case "guides.coupon.delete": {
        if (user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        if (!body.id) return sendJson(res, 400, { error: "Location ID is required." });
        const existing = await supabaseRequest(`/coupon_locations?id=eq.${encodeURIComponent(body.id)}&select=name&limit=1`);
        const name = (Array.isArray(existing) ? existing[0]?.name : undefined) || "Unknown";
        await supabaseRequest(`/coupon_locations?id=eq.${encodeURIComponent(body.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
        await createAuditLog({ actor: user, action: "deleted_coupon_location", tableName: "coupon_locations", recordId: body.id, details: `Coupon location "${name}" deleted.` });
        return sendJson(res, 200, { deleted: true });
      }

      // ── OPS SETTINGS (global session delay) ──
      case "ops.settings.get": {
        const delayMinutes = await getSessionDelayMinutes();
        return sendJson(res, 200, { settings: { sessionDelayMinutes: delayMinutes } });
      }
      case "ops.settings.set": {
        if (user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        const delayMinutes = Number(body.sessionDelayMinutes);
        if (!Number.isFinite(delayMinutes) || delayMinutes < 0 || delayMinutes > 180) return sendJson(res, 400, { error: "Session delay must be between 0 and 180 minutes." });
        await supabaseRequest("/ops_settings?on_conflict=key", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: [{ key: "session_delay_minutes", value: delayMinutes, updated_at: new Date().toISOString() }]
        });
        await createAuditLog({ actor: user, action: "updated_ops_setting", tableName: "ops_settings", recordId: "session_delay_minutes", details: `Session delay set to ${delayMinutes} minutes.` });
        if (body.broadcast !== false) {
          const text = delayMinutes > 0
            ? `⏱️ <b>Schedule update</b>\n\nAll session check-in windows are now extended by <b>+${delayMinutes} mins</b>. Please adjust your operations accordingly.`
            : `⏱️ <b>Schedule update</b>\n\nSession delay removed. Check-in windows are back to the published times.`;
          broadcastToTargets({ targetRole: "committee", text }).catch(() => {});
        }
        return sendJson(res, 200, { settings: { sessionDelayMinutes: delayMinutes } });
      }

      // ── OPS LIVE (real-time check-in counts per venue) ──
      case "ops.live": {
        if (user.role !== "mainboard") return sendJson(res, 403, { error: "Mainboard only." });
        const now = new Date();
        const virtualDate = formatIsoDate(getVirtualScheduleDate(now));
        const cycle = getLoopCycleKey(now);
        const delayMinutes = await getSessionDelayMinutes();
        const blocks = ["before_break", "after_break"];
        const blockIds = blocks.map((block) => buildBlockId(virtualDate, block, now));
        const scheduleRows = await supabaseRequest(`/schedule_items?block_group=eq.${encodeURIComponent(virtualDate)}&is_concurrent=is.false&select=block,venue,venue_code&limit=100`);
        const scheduleItems = Array.isArray(scheduleRows) ? scheduleRows : [];
        const venueMap = new Map();
        for (const item of scheduleItems) {
          if (!item.block) continue;
          const key = `${virtualDate}-${item.block}`;
          const entry = venueMap.get(key) || { venue: item.venue, venueCode: item.venue_code || null };
          venueMap.set(key, entry);
        }

        const sessions = [];
        for (const block of blocks) {
          const window = await getActiveSessionWindow({ blockGroup: virtualDate, block, delayMinutes });
          sessions.push({
            block,
            blockId: buildBlockId(virtualDate, block, now),
            venue: venueMap.get(`${virtualDate}-${block}`)?.venue || null,
            venueCode: venueMap.get(`${virtualDate}-${block}`)?.venueCode || null,
            open: window ? now.getTime() >= window.windowStart && now.getTime() <= window.windowEnd : false,
            windowStart: window ? window.windowStart : null,
            windowEnd: window ? window.windowEnd : null
          });
        }

        const attRows = await supabaseRequest(`/student_attendance?schedule_item_id=in.(${blockIds.map(encodeURIComponent).join(",")})&select=schedule_item_id&limit=2000`);
        const attendanceRows = Array.isArray(attRows) ? attRows : [];

        const blockToSession = new Map(sessions.map((s) => [s.blockId, s]));
        const byVenueMap = new Map();
        for (const row of attendanceRows) {
          const session = blockToSession.get(String(row.schedule_item_id || ""));
          const key = session?.venue || session?.venueCode || "Unknown";
          byVenueMap.set(key, (byVenueMap.get(key) || 0) + 1);
        }
        const byVenue = Array.from(byVenueMap.entries()).map(([venue, count]) => ({ venue, count })).sort((a, b) => b.count - a.count);

        return sendJson(res, 200, {
          session: { virtualDate, cycle },
          delayMinutes,
          sessions,
          byVenue,
          total: attendanceRows.length,
          updatedAt: now.toISOString()
        });
      }

      // ── LAUNCH CHECKLIST ──
      case "launch.list": {
        if (user.role === "student") return sendJson(res, 403, { error: "Committee only." });
        const rows = await supabaseRequest("/launch_checklist_items?select=*&order=sort_order.asc");
        return sendJson(res, 200, { items: (Array.isArray(rows) ? rows : []).map(mapLaunchItem) });
      }
      case "launch.update": {
        if (user.role !== "mainboard" && user.role !== "head") return sendJson(res, 403, { error: "Mainboard or head only." });
        if (!body.id) return sendJson(res, 400, { error: "Checklist item ID is required." });
        if (!["pending", "ready", "issue"].includes(body.status)) return sendJson(res, 400, { error: "Invalid status. Use pending, ready, or issue." });
        const rows = await supabaseRequest(`/launch_checklist_items?id=eq.${encodeURIComponent(body.id)}&select=*`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: { status: body.status, updated_by: user.id, updated_at: new Date().toISOString() } });
        const item = Array.isArray(rows) ? rows[0] : undefined;
        if (!item) return sendJson(res, 404, { error: "Checklist item not found." });
        await createAuditLog({ actor: user, action: "updated_launch_checklist", tableName: "launch_checklist_items", recordId: body.id, details: `Checklist "${item.title}" set to ${body.status}.` });
        return sendJson(res, 200, { item: mapLaunchItem(item) });
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
        if (body.role !== undefined && !ROLES.includes(body.role)) return sendJson(res, 400, { error: "Invalid role." });
        if (body.bureau && !BUREAUS.includes(body.bureau)) return sendJson(res, 400, { error: "Invalid bureau." });
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
        if (!body.scheduleItemId || body.latitude === undefined || body.latitude === null || body.longitude === undefined || body.longitude === null) {
          return sendJson(res, 400, { error: "Event ID and location are required." });
        }
        const lat = Number(body.latitude), lng = Number(body.longitude);
        if (!isFinite(lat) || lat < -90 || lat > 90) return sendJson(res, 400, { error: "Invalid latitude." });
        if (!isFinite(lng) || lng < -180 || lng > 180) return sendJson(res, 400, { error: "Invalid longitude." });

        // Server-side session window enforcement. Disable with CHECKIN_SKIP_WINDOW=1
        // (dev/QA only) — otherwise retroactive and future check-ins are rejected.
        if (process.env.CHECKIN_SKIP_WINDOW !== "1") {
          const parsed = parseBlockId(body.scheduleItemId);
          if (!parsed) return sendJson(res, 400, { error: "Invalid session block ID." });
          const now = new Date();
          const virtualDate = formatIsoDate(getVirtualScheduleDate(now));
          const expectedCycle = getLoopCycleKey(now);
          if (parsed.date !== virtualDate || parsed.cycle !== expectedCycle) {
            return sendJson(res, 400, { error: "This session is not currently open for check-in." });
          }
          const delayMinutes = await getSessionDelayMinutes();
          const window = await getActiveSessionWindow({ blockGroup: parsed.date, block: parsed.block, delayMinutes });
          if (!window) return sendJson(res, 400, { error: "This session has no check-in window configured." });
          if (now.getTime() < window.windowStart) return sendJson(res, 400, { error: "Check-in for this session has not opened yet." });
          if (now.getTime() > window.windowEnd) return sendJson(res, 400, { error: "This session's check-in window has closed." });
        }

        try {
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
              mahallah: user.mahallah || null,
              latitude: lat,
              longitude: lng,
              status: body.status || "present",
              excuse: body.excuse || null
            }]
          });
          const record = Array.isArray(rows) ? rows[0] : undefined;
          if (!record) return sendJson(res, 500, { error: "Failed to submit attendance." });
          return sendJson(res, 201, { attendance: mapStudentAttendance(record) });
        } catch (error) {
          if (error instanceof SupabaseRequestError && error.status === 409) {
            return sendJson(res, 409, { error: "You've already checked in for this session." });
          }
          throw error;
        }
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

      case "leaderboard.fetch": {
        const attRows = await supabaseRequest("/student_attendance?select=user_id,schedule_item_id,event_title,student_name,submitted_at,status,mahallah&order=submitted_at.asc&limit=5000");
        const attendances = Array.isArray(attRows) ? attRows.filter((r) => r.status === "present") : [];

        const scheduleRows = await supabaseRequest("/schedule_items?select=id,scheduled_start_time,program_count,block,block_group&limit=200");
        const scheduleMap = new Map((Array.isArray(scheduleRows) ? scheduleRows : []).map((r) => [r.id, r]));

        // Synthetic block keys (block-<date>-<before_break|after_break>) aggregate the
        // real sessions in that block so leaderboard scoring still works.
        const blockMap = new Map();
        for (const r of Array.isArray(scheduleRows) ? scheduleRows : []) {
          if (!r.block || !r.block_group) continue;
          const key = `block-${r.block_group}-${r.block}`;
          const entry = blockMap.get(key) || { program_count: 0, scheduled_start_time: r.scheduled_start_time };
          entry.program_count += r.program_count || 1;
          if (!entry.scheduled_start_time || r.scheduled_start_time < entry.scheduled_start_time) {
            entry.scheduled_start_time = r.scheduled_start_time;
          }
          blockMap.set(key, entry);
        }

        const userRows = await supabaseRequest("/users?select=id,name,mahallah,photo_url&limit=5000");
        const userMap = new Map((Array.isArray(userRows) ? userRows : []).map((r) => [r.id, r]));

        const rows = attendances.map((a) => {
          const rawId = String(a.schedule_item_id || "");
          // Loop-cycle attendance ids are block-<date>-<block>-w<cycle>; strip the
          // -w<cycle> suffix (no-op for older ids) before resolving the block.
          const baseId = rawId.replace(/-w-?\d+$/, "");
          const isBlockKey = baseId.startsWith("block-");
          const sched = (isBlockKey ? blockMap.get(baseId) : scheduleMap.get(rawId)) || {};
          const usr = userMap.get(a.user_id) || {};
          return {
            user_id: a.user_id,
            student_name: a.student_name,
            mahallah: usr.mahallah || a.mahallah || "",
            photo_url: usr.photo_url || "",
            schedule_item_id: a.schedule_item_id,
            event_title: a.event_title,
            submitted_at: a.submitted_at,
            scheduled_start_time: sched.scheduled_start_time || "",
            program_count: sched.program_count || 1
          };
        });

        return sendJson(res, 200, { rows });
      }

      default:
        return sendJson(res, 400, { error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error(
      `RPC action "${action}" failed`,
      error?.message || error,
      error?.payload ? `| payload: ${JSON.stringify(error.payload)}` : ""
    );
    return sendJson(res, 500, { error: "Internal server error." });
  }
}
