import { createAuditLog, supabaseRequest } from "./supabase.js";

const OP_SELECT = "id,bureau,tool,title,detail,owner,status,metric,updated_at";

export function mapBureauOperation(row) {
  return {
    id: row.id,
    bureau: row.bureau,
    tool: row.tool,
    title: row.title,
    detail: row.detail,
    owner: row.owner,
    status: row.status,
    metric: row.metric,
    updatedAt: row.updated_at
  };
}

export async function listOperationsForUser(user) {
  let path = `/bureau_operations?select=${OP_SELECT}&order=updated_at.desc`;
  if (user.role === "mainboard") {
    return supabaseRequest(path);
  }
  if (user.bureau) {
    path += `&bureau=eq.${encodeURIComponent(user.bureau)}`;
    return supabaseRequest(path);
  }
  return [];
}

export async function updateOperationStatus({ id, status, user }) {
  const rows = await supabaseRequest(`/bureau_operations?id=eq.${encodeURIComponent(id)}&select=${OP_SELECT}`, {
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
      action: "updated_bureau_operation",
      tableName: "bureau_operations",
      recordId: id,
      details: `Operation "${record.title}" (${record.bureau}) status changed to ${status}.`
    });
  }
  return record;
}
