import type { ScheduleItem } from "../types";
import { getStoredSupabaseJwt } from "./apiAuth";

type ScheduleListResponse = {
  items: ScheduleItem[];
  error?: string;
};

type ScheduleItemResponse = {
  item: ScheduleItem;
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

export async function listSchedule() {
  const payload = (await rpc("schedule.list")) as ScheduleListResponse;
  return payload.items;
}

export async function createScheduleItem(input: Partial<ScheduleItem>) {
  const payload = (await rpc("schedule.create", input as Record<string, unknown>)) as ScheduleItemResponse;
  return payload.item;
}

export async function publishScheduleItem(id: string, isLive: boolean, readinessStatus?: string) {
  const payload = (await rpc("schedule.publish", { id, isLive, readinessStatus })) as ScheduleItemResponse;
  return payload.item;
}

export async function updateScheduleItem(id: string, input: Partial<ScheduleItem> & Record<string, unknown>) {
  const payload = (await rpc("schedule.update", { id, ...input })) as ScheduleItemResponse;
  return payload.item;
}
