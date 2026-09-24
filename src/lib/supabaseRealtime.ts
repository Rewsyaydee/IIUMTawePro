import { RealtimeClient } from "@supabase/realtime-js";

// Single shared Realtime socket per device. Presence tracking and the Baiah
// takeover both ride this one connection (Supabase caps concurrent
// connections per project, so wasting one socket per feature is costly at
// event scale).
let client: RealtimeClient | null = null;
let refCount = 0;

export function acquireRealtimeClient(): RealtimeClient | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !anonKey) return null;

  if (client) {
    refCount++;
    return client;
  }

  try {
    const wsUrl = `${supabaseUrl.replace(/\/$/, "").replace(/^http/, "ws")}/realtime/v1`;
    client = new RealtimeClient(wsUrl, {
      params: { apikey: anonKey },
      timeout: 10000
    });
    refCount = 1;
    return client;
  } catch {
    return null;
  }
}

export function releaseRealtimeClient() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && client) {
    try {
      client.disconnect();
    } catch {
      undefined;
    }
    client = null;
  }
}
