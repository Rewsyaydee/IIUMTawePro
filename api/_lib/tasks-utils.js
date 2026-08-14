import { createAuditLog, supabaseRequest } from "./supabase.js";
import { escapeHtml, getAppBaseUrl, sendTelegramMessage } from "./telegram-bot.js";

const TASK_SELECT = "id,bureau,title,description,due_date,due_time,assigned_to,assigned_to_ids,status,priority,notify_minutes_before,is_recurring,created_at,updated_at";

// ── Telegram task-assignment dispatcher ──
// Resolves assignee user ids → telegram_id and DMs each assignee a task
// summary with a web_app deep link back into /tasks. Every attempt is logged
// to public.task_notifications for the audit trail.
export async function dispatchTaskNotifications({ task, assigneeIds }) {
  const uniqueIds = [...new Set((assigneeIds || []).map(String).filter(Boolean))];
  const results = { sent: 0, failed: 0, total: uniqueIds.length };
  if (uniqueIds.length === 0) return results;

  let assignees = [];
  try {
    const rows = await supabaseRequest(`/users?select=id,telegram_id,name&id=in.(${uniqueIds.join(",")})&status=eq.active&limit=50`);
    assignees = Array.isArray(rows) ? rows : [];
  } catch {
    return results;
  }

  const deadline = [task.due_date, task.due_time].filter(Boolean).join(" ") || "No deadline set";
  const text = `📋 <b>New Task Assigned</b>\n\n<b>${escapeHtml(task.title)}</b>\n🏢 ${escapeHtml(task.bureau)}\n📅 Due: ${escapeHtml(deadline)}\n👥 ${escapeHtml(task.assigned_to || "You")}\n\nTap below to open it in TawePro.`;
  const replyMarkup = {
    inline_keyboard: [[{ text: "Open Task", web_app: { url: `${getAppBaseUrl()}/tasks` } }]]
  };

  for (const assignee of assignees) {
    if (!assignee.telegram_id) continue;
    try {
      await sendTelegramMessage(String(assignee.telegram_id), text, replyMarkup);
      results.sent++;
      await logTaskNotification({ taskId: task.id, assigneeUserId: assignee.id, telegramId: assignee.telegram_id, status: "sent" });
    } catch (error) {
      results.failed++;
      await logTaskNotification({ taskId: task.id, assigneeUserId: assignee.id, telegramId: assignee.telegram_id, status: "failed", error: error?.message || "send failed" });
    }
  }
  return results;
}

export async function logTaskNotification({ taskId, assigneeUserId, telegramId, status, error }) {
  try {
    await supabaseRequest("/task_notifications", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: [{
        task_id: taskId,
        assignee_user_id: assigneeUserId || null,
        telegram_id: String(telegramId || ""),
        status,
        error: error ? String(error).slice(0, 300) : null,
        sent_at: status === "sent" ? new Date().toISOString() : null
      }]
    });
  } catch { /* best-effort dispatch log */ }
}

export function mapPoaTask(row) {
  return {
    id: row.id,
    bureau: row.bureau,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    dueTime: row.due_time,
    assignedTo: row.assigned_to,
    assignedToIds: Array.isArray(row.assigned_to_ids) ? row.assigned_to_ids : [],
    status: row.status,
    priority: row.priority,
    notifyMinutesBefore: row.notify_minutes_before,
    isRecurring: row.is_recurring
  };
}

export async function listTasksForUser(user) {
  let path = `/poa_tasks?select=${TASK_SELECT}&order=due_date.asc,due_time.asc`;
  if (user.role === "mainboard") {
    return supabaseRequest(path);
  }
  if (user.bureau) {
    path += `&bureau=eq.${encodeURIComponent(user.bureau)}`;
    return supabaseRequest(path);
  }
  return [];
}

export async function insertTask({ user, task }) {
  // Non-mainboard users can only create tasks for their own bureau
  const bureau = user.role === "mainboard" ? task.bureau : user.bureau;
  const rows = await supabaseRequest(`/poa_tasks?select=${TASK_SELECT}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: [{
      bureau,
      title: task.title,
      description: task.description,
      due_date: task.dueDate,
      due_time: task.dueTime,
      assigned_to: task.assignedTo,
      assigned_to_ids: Array.isArray(task.assignedToIds) ? task.assignedToIds : [],
      status: "todo",
      priority: task.priority,
      notify_minutes_before: task.notifyMinutesBefore || 20,
      is_recurring: task.isRecurring || false
    }]
  });

  const record = Array.isArray(rows) ? rows[0] : undefined;
  if (record) {
    await createAuditLog({
      actor: user,
      action: "created_task",
      tableName: "poa_tasks",
      recordId: record.id,
      details: `Task "${record.title}" created for ${record.bureau}.`
    });
  }
  return record;
}

export async function updateTaskStatus({ id, status, user }) {
  let bureauFilter = "";
  if (user.role !== "mainboard" && user.bureau) {
    bureauFilter = `&bureau=eq.${encodeURIComponent(user.bureau)}`;
  }
  const rows = await supabaseRequest(`/poa_tasks?id=eq.${encodeURIComponent(id)}${bureauFilter}&select=${TASK_SELECT}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: {
      status,
      updated_at: new Date().toISOString()
    }
  });

  const record = Array.isArray(rows) ? rows[0] : undefined;
  if (record) {
    await createAuditLog({
      actor: user,
      action: "updated_task_status",
      tableName: "poa_tasks",
      recordId: id,
      details: `Task "${record.title}" status changed to ${status}.`
    });
  }
  return record;
}

export async function updateTaskDetails({ id, fields, user }) {
  const patch = { updated_at: new Date().toISOString() };
  if (fields.title !== undefined) patch.title = fields.title;
  if (fields.description !== undefined) patch.description = fields.description;
  if (fields.dueDate !== undefined) patch.due_date = fields.dueDate;
  if (fields.dueTime !== undefined) patch.due_time = fields.dueTime;
  if (fields.assignedTo !== undefined) patch.assigned_to = fields.assignedTo;
  if (fields.assignedToIds !== undefined) patch.assigned_to_ids = fields.assignedToIds;
  if (fields.priority !== undefined) patch.priority = fields.priority;
  if (fields.bureau !== undefined) patch.bureau = fields.bureau;
  const rows = await supabaseRequest(`/poa_tasks?id=eq.${encodeURIComponent(id)}&select=${TASK_SELECT}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: patch
  });
  const record = Array.isArray(rows) ? rows[0] : undefined;
  if (record) {
    await createAuditLog({
      actor: user,
      action: "edited_task",
      tableName: "poa_tasks",
      recordId: id,
      details: `Task "${record.title}" details updated.`
    });
  }
  return record;
}

export async function deleteTaskRecord({ id, user }) {
  const existing = await supabaseRequest(`/poa_tasks?id=eq.${encodeURIComponent(id)}&select=title&limit=1`);
  const title = (Array.isArray(existing) ? existing[0]?.title : undefined) || "Unknown";
  await supabaseRequest(`/poa_tasks?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" }
  });
  await createAuditLog({
    actor: user,
    action: "deleted_task",
    tableName: "poa_tasks",
    recordId: id,
    details: `Task "${title}" deleted.`
  });
  return { deleted: true };
}
