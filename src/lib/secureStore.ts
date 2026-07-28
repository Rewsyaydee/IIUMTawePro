import { getTelegramWebApp } from "./telegram";
import type { MockUser } from "../types";

const JWT_KEY = "tawe_jwt";
const PROFILE_KEY = "tawe_user_profile";

function getStorage() {
  return getTelegramWebApp()?.SecureStorage;
}

function safeLsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeLsSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* quota exceeded */ }
}

function safeLsRemove(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

export async function getSessionJwt(): Promise<string | null> {
  const storage = getStorage();
  if (storage) {
    try {
      return await storage.getItem(JWT_KEY);
    } catch {
      return safeLsGet(JWT_KEY);
    }
  }
  return safeLsGet(JWT_KEY);
}

export async function setSessionJwt(jwt: string): Promise<void> {
  const storage = getStorage();
  if (storage) {
    try {
      await storage.setItem(JWT_KEY, jwt);
    } catch {
      safeLsSet(JWT_KEY, jwt);
    }
  } else {
    safeLsSet(JWT_KEY, jwt);
  }
}

export async function removeSessionJwt(): Promise<void> {
  const storage = getStorage();
  if (storage) {
    try {
      await storage.removeItem(JWT_KEY);
    } catch {
      safeLsRemove(JWT_KEY);
    }
  } else {
    safeLsRemove(JWT_KEY);
  }
}

export async function getUserProfile(): Promise<MockUser | null> {
  const storage = getStorage();
  if (storage) {
    try {
      const raw = await storage.getItem(PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      const raw = safeLsGet(PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    }
  }
  const raw = safeLsGet(PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function setUserProfile(user: MockUser): Promise<void> {
  const raw = JSON.stringify(user);
  const storage = getStorage();
  if (storage) {
    try {
      await storage.setItem(PROFILE_KEY, raw);
    } catch {
      safeLsSet(PROFILE_KEY, raw);
    }
  } else {
    safeLsSet(PROFILE_KEY, raw);
  }
}

export async function removeUserProfile(): Promise<void> {
  const storage = getStorage();
  if (storage) {
    try {
      await storage.removeItem(PROFILE_KEY);
    } catch {
      safeLsRemove(PROFILE_KEY);
    }
  } else {
    safeLsRemove(PROFILE_KEY);
  }
}

export async function clearSecureSession(): Promise<void> {
  await Promise.all([removeSessionJwt(), removeUserProfile()]);
}
