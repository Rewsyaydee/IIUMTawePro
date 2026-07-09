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

export async function sendNotification(input: {
  title: string;
  body: string;
  targetRole?: string;
  targetBureau?: string;
  createBanner?: boolean;
  type?: string;
}) {
  return rpc("notify.send", input as Record<string, unknown>);
}

export async function sendEmergency(input: {
  title: string;
  body: string;
  targetRole?: string;
  targetBureau?: string;
}) {
  return rpc("notify.emergency", input as Record<string, unknown>);
}

export async function sendBureauAlert(input: {
  id: string;
  message?: string;
}) {
  return rpc("ops.alert", input as Record<string, unknown>);
}
