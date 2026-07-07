import type { Bureau, MockUser, Role } from "../types";
import { getTelegramWebApp } from "./telegram";

type RedeemAccessInput = {
  code: string;
  displayName: string;
  selectedRole: Role;
  selectedBureau: Bureau;
};

export type ApiAuthResponse = {
  user: MockUser;
  supabaseJwt?: string | null;
  expiresIn?: number;
  persistence?: "stub" | "supabase";
  error?: string;
};

const authUserStorageKey = "tawepro-auth-user";
const authJwtStorageKey = "tawepro-supabase-jwt";
export const authSessionChangedEvent = "tawepro-auth-session";

function apiBase() {
  return import.meta.env.VITE_API_BASE_URL || "";
}

export function shouldUseApiAuth() {
  return import.meta.env.VITE_ENABLE_MOCKS === "false" || import.meta.env.VITE_API_AUTH_BRIDGE === "true";
}

export function isTelegramAvailable() {
  try {
    const webApp = getTelegramWebApp();
    return Boolean(webApp?.initData && webApp.initData.length > 0);
  } catch {
    return false;
  }
}

export function loadAuthSession() {
  if (typeof window === "undefined") return {};
  try {
    const userText = localStorage.getItem(authUserStorageKey);
    const user = userText ? (JSON.parse(userText) as MockUser) : undefined;
    const supabaseJwt = localStorage.getItem(authJwtStorageKey);
    return { user, supabaseJwt };
  } catch {
    return {};
  }
}

export function saveAuthSession(session: ApiAuthResponse) {
  if (typeof window === "undefined") return;
  if (session.user) {
    localStorage.setItem(authUserStorageKey, JSON.stringify(session.user));
  }
  if (session.supabaseJwt) {
    localStorage.setItem(authJwtStorageKey, session.supabaseJwt);
  } else {
    localStorage.removeItem(authJwtStorageKey);
  }
  window.dispatchEvent(new Event(authSessionChangedEvent));
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(authUserStorageKey);
  localStorage.removeItem(authJwtStorageKey);
  window.dispatchEvent(new Event(authSessionChangedEvent));
}

export function getStoredSupabaseJwt() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(authJwtStorageKey);
}

export async function authenticateTelegram(invite?: RedeemAccessInput) {
  return postAuth("/api/auth/telegram", {
    initData: getTelegramWebApp()?.initData || "",
    inviteCode: invite?.code,
    displayName: invite?.displayName,
    selectedRole: invite?.selectedRole,
    selectedBureau: invite?.selectedBureau
  });
}

export async function redeemAccessCode(input: RedeemAccessInput) {
  return postAuth("/api/invites/redeem", {
    initData: getTelegramWebApp()?.initData || "",
    code: input.code,
    displayName: input.displayName,
    selectedRole: input.selectedRole,
    selectedBureau: input.selectedBureau
  });
}

async function postAuth(path: string, body: Record<string, unknown>): Promise<ApiAuthResponse> {
  const response = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = (await response.json()) as ApiAuthResponse;
  if (!response.ok) {
    throw new Error(payload.error || "Authentication failed.");
  }
  saveAuthSession(payload);
  return payload;
}
