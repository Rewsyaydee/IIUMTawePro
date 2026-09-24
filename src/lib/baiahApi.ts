import { getStoredSupabaseJwt } from "./apiAuth";

export type BaiahSettings = {
  isBaiahActive: boolean;
  baiahStartAt: string | null;
  baiahMessage: string;
  baiahNotify: boolean;
  baiahNotifyLeadMinutes: number;
  baiahActivatedAt: string | null;
  baiahUpdatedBy?: string | null;
  baiahSongUrl: string | null;
  baiahSongEnabled: boolean;
  baiahSkipEnabled: boolean;
  updatedAt: string | null;
};

export type BaiahUpdateInput = {
  active?: boolean;
  scheduledAt?: string | null;
  message?: string;
  notify?: boolean;
  notifyLeadMinutes?: number;
  songUrl?: string | null;
  songEnabled?: boolean;
  skipEnabled?: boolean;
};

export const DEFAULT_BAIAH_SONG_URL = "/audio/baiah.mp3";

export function mapBaiahRow(row: Record<string, unknown>): BaiahSettings {
  return {
    isBaiahActive: Boolean(row.is_baiah_active),
    baiahStartAt: (row.baiah_start_at as string | null) ?? null,
    baiahMessage: (row.baiah_message as string) || "BAIAH 2026: WELCOME TO IIUM",
    baiahNotify: row.baiah_notify !== false,
    baiahNotifyLeadMinutes: Number.isFinite(Number(row.baiah_notify_lead_minutes))
      ? Number(row.baiah_notify_lead_minutes)
      : 2,
    baiahActivatedAt: (row.baiah_activated_at as string | null) ?? null,
    baiahUpdatedBy: (row.baiah_updated_by as string | null) ?? null,
    baiahSongUrl: (row.baiah_song_url as string | null) ?? null,
    baiahSongEnabled: row.baiah_song_enabled === true,
    baiahSkipEnabled: row.baiah_skip_enabled !== false,
    updatedAt: (row.updated_at as string) ?? null
  };
}

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

// Direct Supabase REST read (anon key + RLS). Used for polling at event scale:
// it costs zero Vercel invocations and tiny Supabase egress.
export async function fetchBaiahSettingsDirect(): Promise<BaiahSettings | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !anonKey) return null;

  const select = [
    "is_baiah_active",
    "baiah_start_at",
    "baiah_message",
    "baiah_notify",
    "baiah_notify_lead_minutes",
    "baiah_activated_at",
    "baiah_updated_by",
    "baiah_song_url",
    "baiah_song_enabled",
    "baiah_skip_enabled",
    "updated_at"
  ].join(",");

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/app_settings?id=eq.1&select=${select}&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
    });
    if (!response.ok) return null;
    const rows = await response.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    return row ? mapBaiahRow(row) : null;
  } catch {
    return null;
  }
}

// Admin path goes through the guarded RPC (mainboard role enforced server-side).
export async function fetchBaiahSettings(): Promise<BaiahSettings> {
  const payload = (await rpc("baiah.get")) as { settings: BaiahSettings; error?: string };
  return payload.settings;
}

export async function updateBaiahSettings(input: BaiahUpdateInput): Promise<BaiahSettings> {
  const payload = (await rpc("baiah.set", input)) as { settings: BaiahSettings; error?: string };
  return payload.settings;
}
