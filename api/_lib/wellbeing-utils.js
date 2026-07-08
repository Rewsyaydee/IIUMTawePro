import { sendJson, verifyAppSessionFromRequest } from "./auth-utils.js";
import { createAuditLog, getUserById, supabaseRequest } from "./supabase.js";

const REPORT_SELECT = "id,reference,submitted_by,student_name,phone,category,notes,status,assigned_to,submitted_at,resolved_at";

export function generateReference() {
  const seq = Math.floor(Date.now() / 1000).toString(36).toUpperCase().slice(-4);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `WEL-${seq}${rand}`;
}

export function mapWellbeingReport(row) {
  return {
    id: row.id,
    reference: row.reference,
    studentName: row.student_name,
    phone: row.phone,
    category: row.category,
    notes: row.notes,
    status: row.status,
    assignedTo: row.assigned_to || undefined,
    submittedAt: row.submitted_at,
    resolvedAt: row.resolved_at || undefined
  };
}

export async function requireActiveAppUser(req, res) {
  const session = verifyAppSessionFromRequest(req);
  if (!session.ok) {
    sendJson(res, 401, { error: session.reason });
    return null;
  }

  const user = await getUserById(session.claims.app_user_id);
  if (!user) {
    sendJson(res, 403, { error: "Active app user not found." });
    return null;
  }

  return user;
}

export function isWelfareUser(user) {
  return user?.bureau === "Welfare";
}

export function isMainboardUser(user) {
  return user?.role === "mainboard";
}

export function canManageReports(user) {
  return isWelfareUser(user) || isMainboardUser(user);
}

export async function listReportsForUser(user) {
  let path = `/wellbeing_reports?select=${REPORT_SELECT}&order=submitted_at.desc`;
  if (canManageReports(user)) {
    return supabaseRequest(path);
  }
  path += `&submitted_by=eq.${encodeURIComponent(user.id)}`;
  return supabaseRequest(path);
}

export async function insertReport({ user, studentName, phone, category, notes }) {
  const reference = generateReference();
  const rows = await supabaseRequest(`/wellbeing_reports?select=${REPORT_SELECT}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: [
      {
        reference,
        submitted_by: user.id,
        student_name: studentName,
        phone,
        category,
        notes,
        status: "submitted"
      }
    ]
  });

  const report = Array.isArray(rows) ? rows[0] : undefined;
  if (report) {
    await createAuditLog({
      actor: user,
      action: "submitted_wellbeing_report",
      tableName: "wellbeing_reports",
      recordId: report.id,
      details: `Report ${reference} submitted by ${studentName} (${category}).`
    });
  }
  return report;
}

export async function updateReportStatus({ id, status, user }) {
  const patch = {
    status,
    updated_at: new Date().toISOString()
  };
  if (status === "responded" || status === "escalated") {
    patch.assigned_to = user.id;
  }
  if (status === "resolved") {
    patch.resolved_at = new Date().toISOString();
  }

  const rows = await supabaseRequest(`/wellbeing_reports?id=eq.${encodeURIComponent(id)}&select=${REPORT_SELECT}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: patch
  });

  const report = Array.isArray(rows) ? rows[0] : undefined;
  if (report) {
    await createAuditLog({
      actor: user,
      action: "updated_wellbeing_report",
      tableName: "wellbeing_reports",
      recordId: id,
      details: `Report ${report.reference} status changed to ${status}.`
    });
  }
  return report;
}

export function validateReportInput({ studentName, phone, category, notes }) {
  if (!studentName || !String(studentName).trim()) return "Student name is required.";
  if (!phone || !String(phone).trim()) return "Phone is required.";
  if (!category || !String(category).trim()) return "Category is required.";
  if (!notes || !String(notes).trim()) return "Notes are required.";
  return null;
}
