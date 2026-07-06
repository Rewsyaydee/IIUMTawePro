import type { Bureau, MockUser, Role } from "../types";
import { getTelegramWebApp } from "./telegram";

type RedeemAccessInput = {
  code: string;
  displayName: string;
  selectedRole: Role;
  selectedBureau: Bureau;
};

type ApiAuthResponse = {
  user: MockUser;
  supabaseJwt?: string | null;
  error?: string;
};

function apiBase() {
  return import.meta.env.VITE_API_BASE_URL || "";
}

export function shouldUseApiAuth() {
  return import.meta.env.VITE_ENABLE_MOCKS === "false" || import.meta.env.VITE_API_AUTH_BRIDGE === "true";
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
  return payload;
}
