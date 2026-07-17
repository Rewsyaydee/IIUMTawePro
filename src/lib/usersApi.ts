import { getStoredSupabaseJwt } from "./apiAuth";

function apiBase() {
  return import.meta.env.VITE_API_BASE_URL || "";
}

function sessionHeaders(): Record<string, string> {
  const token = getStoredSupabaseJwt();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function rpc(action: string, data: Record<string, unknown> = {}) {
  const response = await fetch(`${apiBase()}/api/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeaders() },
    body: JSON.stringify({ action, ...data })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "RPC request failed.");
  return payload;
}

export async function listUsers() {
  const payload = (await rpc("users.list")) as { users: Record<string, unknown>[] };
  return payload.users;
}

export async function updateUser(id: string, fields: { role?: string; bureau?: string | null }) {
  const payload = (await rpc("users.update", { id, ...fields })) as { user: Record<string, unknown> };
  return payload.user;
}

export async function revokeUserApi(id: string) {
  const payload = (await rpc("users.revoke", { id })) as { user: Record<string, unknown> };
  return payload.user;
}
