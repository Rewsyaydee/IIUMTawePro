import { getStoredSupabaseJwt } from "./apiAuth";

export type BaiahSettings = {
  isBaiahActive: boolean;
  baiahStartAt: string | null;
  baiahMessage: string;
  baiahNotify: boolean;
  baiahActivatedAt: string | null;
  baiahUpdatedBy?: string | null;
  updatedAt: string | null;
};

export type BaiahUpdateInput = {
  active?: boolean;
  scheduledAt?: string | null;
  message?: string;
  notify?: boolean;
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

// Public read — works before sign-in (the takeover must cover everyone).
export async function fetchBaiahSettings(): Promise<BaiahSettings> {
  const payload = (await rpc("baiah.get")) as { settings: BaiahSettings; error?: string };
  return payload.settings;
}

export async function updateBaiahSettings(input: BaiahUpdateInput): Promise<BaiahSettings> {
  const payload = (await rpc("baiah.set", input)) as { settings: BaiahSettings; error?: string };
  return payload.settings;
}
