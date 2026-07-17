import { createAuditLog, supabaseRequest } from "./supabase.js";

const TASK_SELECT = "id,bureau,title,description,due_date,due_time,assigned_to,status,priority,notify_minutes_before,is_recurring,created_at,updated_at";

export function mapPoaTask(row) {
  return {
    id: row.id,
    bureau: row.bureau,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    dueTime: row.due_time,
    assignedTo: row.assigned_to,
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
  const rows = await supabaseRequest(`/poa_tasks?select=${TASK_SELECT}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: [{
      bureau: task.bureau,
      title: task.title,
      description: task.description,
      due_date: task.dueDate,
      due_time: task.dueTime,
      assigned_to: task.assignedTo,
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
  const rows = await supabaseRequest(`/poa_tasks?id=eq.${encodeURIComponent(id)}&select=${TASK_SELECT}`, {
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
