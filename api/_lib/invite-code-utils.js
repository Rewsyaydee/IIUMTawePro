import { supabaseRequest } from "./supabase.js";

export async function findInviteCodeByCode(code) {
  const normalized = String(code).trim().toUpperCase();
  const rows = await supabaseRequest(
    `/invite_codes?code=eq.${encodeURIComponent(normalized)}&select=id,code,role,bureau,expires_at,used_by,used_at,created_by,created_at&limit=1`
  );
  return Array.isArray(rows) ? rows[0] : undefined;
}

export async function markInviteCodeUsed({ id, userId }) {
  const rows = await supabaseRequest(`/invite_codes?id=eq.${encodeURIComponent(id)}&select=id,code,role,bureau`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: {
      used_by: userId,
      used_at: new Date().toISOString()
    }
  });
  return Array.isArray(rows) ? rows[0] : undefined;
}

export function isInviteValid(row) {
  if (!row) return { ok: false, reason: "Code not recognised." };
  if (row.used_by && row.used_at) return { ok: false, reason: "Code already used." };
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return { ok: false, reason: "Code has expired." };
  }
  return {
    ok: true,
    role: row.role,
    bureau: row.bureau || undefined,
    reusable: false,
    id: row.id
  };
}
