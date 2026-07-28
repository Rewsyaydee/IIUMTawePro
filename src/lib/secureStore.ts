import { getTelegramWebApp } from "./telegram";
import type { MockUser } from "../types";

const JWT_KEY = "tawe_jwt";
const PROFILE_KEY = "tawe_user_profile";

function getStorage() {
  return getTelegramWebApp()?.SecureStorage;
}

async function storageGet(key: string): Promise<string | null> {
  const s = getStorage();
  if (s && typeof s.getItem === "function") {
    try { return await s.getItem(key); } catch { /* fall through */ }
  }
  try { return localStorage.getItem(key); } catch { return null; }
}

async function storageSet(key: string, value: string): Promise<void> {
  const s = getStorage();
  if (s && typeof s.setItem === "function") {
    try { await s.setItem(key, value); return; } catch { /* fall through */ }
  }
  try { localStorage.setItem(key, value); } catch { /* quota */ }
}

async function storageRemove(key: string): Promise<void> {
  const s = getStorage();
  if (s && typeof s.removeItem === "function") {
    try { await s.removeItem(key); } catch { /* fall through */ }
  }
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

export async function getSessionJwt(): Promise<string | null> {
  return storageGet(JWT_KEY);
}

export async function setSessionJwt(jwt: string): Promise<void> {
  await storageSet(JWT_KEY, jwt);
}

export async function removeSessionJwt(): Promise<void> {
  await storageRemove(JWT_KEY);
}

export async function getUserProfile(): Promise<MockUser | null> {
  const raw = await storageGet(PROFILE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function setUserProfile(user: MockUser): Promise<void> {
  await storageSet(PROFILE_KEY, JSON.stringify(user));
}

export async function removeUserProfile(): Promise<void> {
  await storageRemove(PROFILE_KEY);
}

export async function clearSecureSession(): Promise<void> {
  await Promise.all([removeSessionJwt(), removeUserProfile()]);
}
