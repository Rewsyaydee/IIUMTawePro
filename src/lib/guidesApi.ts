import { getStoredSupabaseJwt } from "./apiAuth";

export type EmergencyContact = {
  id: string;
  name: string;
  role: string;
  phone: string;
  priority: boolean;
  sortOrder: number;
};

export type CouponLocation = {
  id: string;
  name: string;
  location: string;
  accepts: string;
  hours: string;
  sortOrder: number;
};

export type LaunchChecklistItem = {
  id: string;
  title: string;
  category: string;
  owner: string;
  status: "pending" | "ready" | "issue";
  sortOrder: number;
  updatedAt: string;
  updatedBy?: string;
};

export type OpsLiveSession = {
  block: string;
  blockId: string;
  venue: string | null;
  venueCode: string | null;
  open: boolean;
  windowStart: number | null;
  windowEnd: number | null;
};

export type OpsLiveData = {
  session: { virtualDate: string; cycle: string };
  delayMinutes: number;
  sessions: OpsLiveSession[];
  byVenue: Array<{ venue: string; count: number }>;
  total: number;
  updatedAt: string;
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

// ── Emergency contacts ──
export async function listEmergencyContacts(): Promise<EmergencyContact[]> {
  const payload = (await rpc("guides.emergency.list")) as { contacts: EmergencyContact[]; error?: string };
  return payload.contacts;
}

export async function createEmergencyContact(input: { name: string; role: string; phone: string; priority?: boolean }): Promise<EmergencyContact> {
  const payload = (await rpc("guides.emergency.create", input)) as { contact: EmergencyContact; error?: string };
  return payload.contact;
}

export async function updateEmergencyContact(id: string, input: Partial<EmergencyContact>): Promise<EmergencyContact> {
  const payload = (await rpc("guides.emergency.update", { id, ...input })) as { contact: EmergencyContact; error?: string };
  return payload.contact;
}

export async function deleteEmergencyContact(id: string): Promise<void> {
  await rpc("guides.emergency.delete", { id });
}

// ── Coupon locations ──
export async function listCouponLocations(): Promise<CouponLocation[]> {
  const payload = (await rpc("guides.coupon.list")) as { locations: CouponLocation[]; error?: string };
  return payload.locations;
}

export async function createCouponLocation(input: { name: string; location: string; accepts?: string; hours?: string }): Promise<CouponLocation> {
  const payload = (await rpc("guides.coupon.create", input)) as { location: CouponLocation; error?: string };
  return payload.location;
}

export async function updateCouponLocation(id: string, input: Partial<CouponLocation>): Promise<CouponLocation> {
  const payload = (await rpc("guides.coupon.update", { id, ...input })) as { location: CouponLocation; error?: string };
  return payload.location;
}

export async function deleteCouponLocation(id: string): Promise<void> {
  await rpc("guides.coupon.delete", { id });
}

// ── Ops settings (session delay) ──
export async function getOpsSettings(): Promise<{ sessionDelayMinutes: number }> {
  const payload = (await rpc("ops.settings.get")) as { settings: { sessionDelayMinutes: number }; error?: string };
  return payload.settings;
}

export async function setOpsSettings(sessionDelayMinutes: number, broadcast = true): Promise<{ sessionDelayMinutes: number }> {
  const payload = (await rpc("ops.settings.set", { sessionDelayMinutes, broadcast })) as { settings: { sessionDelayMinutes: number }; error?: string };
  return payload.settings;
}

// ── Ops live dashboard ──
export async function fetchOpsLive(): Promise<OpsLiveData> {
  const payload = (await rpc("ops.live")) as OpsLiveData & { error?: string };
  return payload;
}

// ── Launch checklist ──
export async function listLaunchChecklist(): Promise<LaunchChecklistItem[]> {
  const payload = (await rpc("launch.list")) as { items: LaunchChecklistItem[]; error?: string };
  return payload.items;
}

export async function updateLaunchChecklist(id: string, status: LaunchChecklistItem["status"]): Promise<LaunchChecklistItem> {
  const payload = (await rpc("launch.update", { id, status })) as { item: LaunchChecklistItem; error?: string };
  return payload.item;
}
