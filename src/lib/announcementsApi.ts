import type { Announcement } from "../types";
import { getStoredSupabaseJwt } from "./apiAuth";

type AnnouncementListResponse = {
  items: Announcement[];
  error?: string;
};

type AnnouncementResponse = {
  item: Announcement;
  error?: string;
};

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

export async function listAnnouncements() {
  const payload = (await rpc("announcements.list")) as AnnouncementListResponse;
  return payload.items;
}

export async function createAnnouncement(input: { title: string; body: string; type: string }) {
  const payload = (await rpc("announcements.create", input as Record<string, unknown>)) as AnnouncementResponse;
  return payload.item;
}

export async function deactivateAnnouncementApi(id: string) {
  const payload = (await rpc("announcements.deactivate", { id })) as AnnouncementResponse;
  return payload.item;
}

export async function listAuditLog() {
  const payload = (await rpc("audit.list")) as { items: unknown[]; error?: string };
  return payload.items;
}
