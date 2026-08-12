import { RealtimeChannel, RealtimeClient } from "@supabase/realtime-js";
import { getTelegramWebApp } from "./telegram";

// Stealth presence tracker: subscribes to the "online-users" channel with zero
// UI footprint. Presence keys are hashed so other subscribers never see raw
// Telegram IDs.

let client: RealtimeClient | null = null;
let channel: RealtimeChannel | null = null;

function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

export function initPresenceTracker(): () => void {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !anonKey) return () => {};

  const telegramId = getTelegramWebApp()?.initDataUnsafe?.user?.id;
  const presenceKey =
    telegramId != null
      ? `u_${djb2(String(telegramId))}`
      : `a_${Math.random().toString(36).slice(2, 12)}`;

  try {
    const wsUrl = `${supabaseUrl.replace(/\/$/, "").replace(/^http/, "ws")}/realtime/v1`;
    client = new RealtimeClient(wsUrl, {
      params: { apikey: anonKey },
      timeout: 10000
    });

    channel = client.channel("online-users", {
      config: { presence: { key: presenceKey } }
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel?.track({ online: true, at: new Date().toISOString() });
      }
    });
  } catch {
    // Silent by design — presence must never break or clutter the app.
  }

  return () => {
    try { channel?.untrack(); } catch {}
    try { if (channel) client?.removeChannel(channel); } catch {}
    try { client?.disconnect(); } catch {}
    client = null;
    channel = null;
  };
}
