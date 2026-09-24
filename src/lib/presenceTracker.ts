import { RealtimeChannel } from "@supabase/realtime-js";
import { getTelegramWebApp } from "./telegram";
import { acquireRealtimeClient, releaseRealtimeClient } from "./supabaseRealtime";

// Stealth presence tracker: subscribes to the "online-users" channel with zero
// UI footprint. Presence keys are hashed so other subscribers never see raw
// Telegram IDs. Rides the shared Realtime socket.

function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

export function initPresenceTracker(): () => void {
  const client = acquireRealtimeClient();
  if (!client) return () => {};

  const telegramId = getTelegramWebApp()?.initDataUnsafe?.user?.id;
  const presenceKey =
    telegramId != null
      ? `u_${djb2(String(telegramId))}`
      : `a_${Math.random().toString(36).slice(2, 12)}`;

  let channel: RealtimeChannel | null = null;
  try {
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
    try { if (channel) client.removeChannel(channel); } catch {}
    releaseRealtimeClient();
  };
}
