import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import type { CreateTypes } from "canvas-confetti";
import { RealtimeChannel, RealtimeClient } from "@supabase/realtime-js";
import { hapticImpact } from "../lib/telegram";
import { fetchBaiahSettings, type BaiahSettings } from "../lib/baiahApi";

// Per-user safety cap: even if the mainboard forgets to deactivate, the
// overlay hides itself this long after activation.
const AUTO_HIDE_MS = 30 * 60 * 1000;

const CONFETTI_COLORS = ["#E5D3B3", "#f7e7c3", "#c9a95f", "#22a879", "#3db99a", "#ffffff", "#ffd166"];

function hasRealtimeEnv() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

function supportsWorker() {
  try {
    return (
      typeof Worker !== "undefined" &&
      typeof OffscreenCanvas !== "undefined" &&
      typeof HTMLCanvasElement.prototype.transferControlToOffscreen === "function"
    );
  } catch {
    return false;
  }
}

export function splitMessage(message: string): [string, string] {
  const trimmed = (message || "").trim() || "BAIAH 2026: WELCOME TO IIUM";
  const colon = trimmed.indexOf(":");
  if (colon > 0 && colon < trimmed.length - 1) {
    return [trimmed.slice(0, colon).trim(), trimmed.slice(colon + 1).trim()];
  }
  const words = trimmed.split(/\s+/);
  if (words.length <= 2) return [trimmed, ""];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

function isExpired(settings: BaiahSettings | null) {
  if (!settings?.isBaiahActive) return false;
  if (!settings.baiahActivatedAt) return false;
  const activatedAt = new Date(settings.baiahActivatedAt).getTime();
  if (Number.isNaN(activatedAt)) return false;
  return Date.now() - activatedAt > AUTO_HIDE_MS;
}

// The full pyrotechnics: corner cannons + follow-up waves. Returns the timer
// ids so the caller can cancel when the overlay goes away.
function fireCannons(instance: CreateTypes, timers: number[]) {
  const colors = CONFETTI_COLORS;
  const corner = (x: number, angle: number, overrides: Record<string, unknown> = {}) =>
    instance({
      particleCount: 90,
      angle,
      spread: 70,
      startVelocity: 62,
      ticks: 240,
      scalar: 1.05,
      origin: { x, y: 1 },
      colors,
      ...overrides
    });

  corner(0, 60);
  corner(1, 120);

  const waves: Array<{ delay: number; run: () => void }> = [
    {
      delay: 200,
      run: () => {
        corner(0, 55);
        corner(1, 125);
      }
    },
    {
      delay: 480,
      run: () => {
        corner(0.05, 72, { particleCount: 60, startVelocity: 72, scalar: 0.9 });
        corner(0.95, 108, { particleCount: 60, startVelocity: 72, scalar: 0.9 });
      }
    },
    {
      delay: 850,
      run: () => {
        corner(0, 45);
        corner(1, 135);
        instance({
          particleCount: 120,
          spread: 170,
          startVelocity: 48,
          ticks: 260,
          origin: { x: 0.5, y: 1 },
          colors
        });
      }
    },
    {
      delay: 1350,
      run: () => {
        corner(0.15, 62, { particleCount: 70, scalar: 1.15 });
        corner(0.85, 118, { particleCount: 70, scalar: 1.15 });
      }
    },
    {
      delay: 1900,
      run: () => {
        corner(0, 60);
        corner(1, 120);
      }
    }
  ];

  for (const wave of waves) {
    timers.push(window.setTimeout(wave.run, wave.delay));
  }
}

function BaiahTakeover() {
  const [settings, setSettings] = useState<BaiahSettings | null>(null);
  const [visible, setVisible] = useState(false);
  const [realtimeOk, setRealtimeOk] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiRef = useRef<CreateTypes | null>(null);
  const waveTimersRef = useRef<number[]>([]);
  const hapticEpochRef = useRef<string | null>(null);
  const lastTapRef = useRef(0);

  // Initial state — matters for users who open the app mid-takeover.
  useEffect(() => {
    if (!hasRealtimeEnv()) return;
    let cancelled = false;
    fetchBaiahSettings()
      .then((next) => {
        if (!cancelled) setSettings(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime: watch is_baiah_active flip on the single app_settings row.
  useEffect(() => {
    if (!hasRealtimeEnv()) return;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    let cancelled = false;
    let client: RealtimeClient | null = null;
    let channel: RealtimeChannel | null = null;

    try {
      const wsUrl = `${supabaseUrl.replace(/\/$/, "").replace(/^http/, "ws")}/realtime/v1`;
      client = new RealtimeClient(wsUrl, { params: { apikey: anonKey }, timeout: 10000 });
      channel = client.channel("baiah-takeover");
      channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_settings" },
        (payload: { new?: Record<string, unknown> }) => {
          const row = payload?.new;
          if (!row) return;
          setSettings((prev) => ({
            isBaiahActive: Boolean(row.is_baiah_active),
            baiahStartAt: (row.baiah_start_at as string | null) ?? prev?.baiahStartAt ?? null,
            baiahMessage: (row.baiah_message as string) || prev?.baiahMessage || "BAIAH 2026: WELCOME TO IIUM",
            baiahNotify: row.baiah_notify !== false,
            baiahActivatedAt: (row.baiah_activated_at as string | null) ?? prev?.baiahActivatedAt ?? null,
            baiahUpdatedBy: (row.baiah_updated_by as string | null) ?? prev?.baiahUpdatedBy ?? null,
            updatedAt: (row.updated_at as string) ?? prev?.updatedAt ?? null
          }));
        }
      );
      channel.subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") setRealtimeOk(true);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setRealtimeOk(false);
      });
    } catch {
      setRealtimeOk(false);
    }

    return () => {
      cancelled = true;
      try {
        channel?.unsubscribe();
      } catch {
        undefined;
      }
      try {
        client?.disconnect();
      } catch {
        undefined;
      }
    };
  }, []);

  // Fallback poll (only while Realtime is unhealthy) + resync on tab focus.
  useEffect(() => {
    if (!hasRealtimeEnv()) return;
    let cancelled = false;
    const refresh = () => {
      fetchBaiahSettings()
        .then((next) => {
          if (!cancelled) setSettings(next);
        })
        .catch(() => {});
    };
    const handleVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", handleVisible);
    const timer = realtimeOk ? null : window.setInterval(refresh, 45000);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisible);
      if (timer) window.clearInterval(timer);
    };
  }, [realtimeOk]);

  // State machine: active + not expired => visible. Heavy haptic fires once
  // per activation epoch, the instant the change lands.
  useEffect(() => {
    if (!settings) return;
    if (settings.isBaiahActive && !isExpired(settings)) {
      setVisible(true);
      const epoch = settings.baiahActivatedAt || "active";
      if (hapticEpochRef.current !== epoch) {
        hapticEpochRef.current = epoch;
        hapticImpact("heavy");
      }
    } else {
      setVisible(false);
    }
  }, [settings]);

  // Auto-hide cap per user.
  useEffect(() => {
    if (!visible || !settings) return;
    const startedAt = settings.baiahActivatedAt ? new Date(settings.baiahActivatedAt).getTime() : Date.now();
    const remaining = Math.max(0, startedAt + AUTO_HIDE_MS - Date.now());
    const timer = window.setTimeout(() => setVisible(false), remaining);
    return () => window.clearTimeout(timer);
  }, [visible, settings]);

  // Mount the confetti canvas with the overlay and launch the cannons.
  useEffect(() => {
    if (!visible || !canvasRef.current) return;
    let instance: CreateTypes | null = null;
    try {
      instance = confetti.create(canvasRef.current, { resize: true, useWorker: supportsWorker() });
    } catch {
      try {
        instance = confetti.create(canvasRef.current, { resize: true, useWorker: false });
      } catch {
        instance = null;
      }
    }
    confettiRef.current = instance;
    if (instance) fireCannons(instance, waveTimersRef.current);

    return () => {
      for (const id of waveTimersRef.current) window.clearTimeout(id);
      waveTimersRef.current = [];
      try {
        instance?.reset();
      } catch {
        undefined;
      }
      confettiRef.current = null;
    };
  }, [visible]);

  if (!visible) return null;

  const [lineOne, lineTwo] = splitMessage(settings?.baiahMessage || "");

  const handleTap = (event: React.PointerEvent<HTMLDivElement>) => {
    const instance = confettiRef.current;
    if (!instance) return;
    const now = performance.now();
    if (now - lastTapRef.current < 55) return;
    lastTapRef.current = now;

    hapticImpact("medium");
    const x = event.clientX / Math.max(window.innerWidth, 1);
    const y = event.clientY / Math.max(window.innerHeight, 1);

    // Small burst at the finger…
    instance({
      particleCount: 40,
      spread: 62,
      startVelocity: 34,
      scalar: 0.95,
      ticks: 170,
      origin: { x, y },
      colors: CONFETTI_COLORS
    });
    // …plus a sparkle ring for extra joy.
    instance({
      particleCount: 18,
      spread: 360,
      startVelocity: 16,
      scalar: 0.7,
      ticks: 140,
      origin: { x, y },
      colors: CONFETTI_COLORS
    });
  };

  return (
    <div
      className="baiah-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Baiah celebration"
      onPointerDown={handleTap}
    >
      <div className="baiah-rays" aria-hidden="true" />
      <div className="baiah-vignette" aria-hidden="true" />
      <div className="baiah-content">
        <span className="baiah-kicker">IIUM Ta&apos;aruf Week 2026</span>
        <h1 className="baiah-title">
          <span className="baiah-line baiah-line-one">{lineOne}</span>
          {lineTwo ? <span className="baiah-line baiah-line-two">{lineTwo}</span> : null}
        </h1>
        <span className="baiah-hint">Tap anywhere ✨</span>
      </div>
      <canvas ref={canvasRef} className="baiah-canvas" aria-hidden="true" />
    </div>
  );
}

export default BaiahTakeover;
