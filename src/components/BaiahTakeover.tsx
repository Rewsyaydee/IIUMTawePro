import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import type { CreateTypes } from "canvas-confetti";
import { RealtimeChannel } from "@supabase/realtime-js";
import { hapticImpact } from "../lib/telegram";
import { acquireRealtimeClient, releaseRealtimeClient } from "../lib/supabaseRealtime";
import { DEFAULT_BAIAH_SONG_URL, fetchBaiahSettingsDirect, type BaiahSettings } from "../lib/baiahApi";

// Per-user safety cap: even if the mainboard forgets to deactivate, the
// overlay hides itself this long after activation.
const AUTO_HIDE_MS = 30 * 60 * 1000;
// Local schedule trigger only arms within this horizon (re-armed by polls).
const LOCAL_ARM_HORIZON_MS = 30 * 60 * 1000;

const DISMISS_KEY = "baiah-dismissed-epoch";
const SOUND_KEY = "baiah-sound";

const CONFETTI_COLORS = ["#E5D3B3", "#f7e7c3", "#c9a95f", "#22a879", "#3db99a", "#ffffff", "#ffd166"];

const ANDROID_VIBRATE = (() => {
  try {
    return /Android/i.test(navigator.userAgent) && typeof navigator.vibrate === "function";
  } catch {
    return false;
  }
})();

const PERF_LOW = (() => {
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (typeof memory === "number" && memory <= 4) return true;
    if (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4) return true;
  } catch {
    undefined;
  }
  return false;
})();

function hasRealtimeEnv() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL);
}

function supportsWorker() {
  if (PERF_LOW) return false;
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

function epochFor(settings: BaiahSettings | null): string | null {
  if (!settings) return null;
  if (settings.isBaiahActive) return `active:${settings.baiahActivatedAt || "on"}`;
  if (settings.baiahStartAt) return `sched:${settings.baiahStartAt}`;
  return null;
}

function mergeRealtimeRow(prev: BaiahSettings | null, row: Record<string, unknown>): BaiahSettings {
  const pick = <T,>(value: T | undefined, fallback: T): T => (value === undefined ? fallback : value);
  return {
    isBaiahActive: Boolean(row.is_baiah_active),
    baiahStartAt: pick(row.baiah_start_at as string | null | undefined, prev?.baiahStartAt ?? null),
    baiahMessage: (row.baiah_message as string) || prev?.baiahMessage || "BAIAH 2026: WELCOME TO IIUM",
    baiahNotify: row.baiah_notify !== false,
    baiahNotifyLeadMinutes: Number.isFinite(Number(row.baiah_notify_lead_minutes))
      ? Number(row.baiah_notify_lead_minutes)
      : prev?.baiahNotifyLeadMinutes ?? 2,
    baiahActivatedAt: pick(row.baiah_activated_at as string | null | undefined, prev?.baiahActivatedAt ?? null),
    baiahUpdatedBy: pick(row.baiah_updated_by as string | null | undefined, prev?.baiahUpdatedBy ?? null),
    baiahSongUrl: pick(row.baiah_song_url as string | null | undefined, prev?.baiahSongUrl ?? null),
    baiahSongEnabled: row.baiah_song_enabled === undefined ? prev?.baiahSongEnabled ?? false : row.baiah_song_enabled === true,
    baiahSkipEnabled: row.baiah_skip_enabled === undefined ? prev?.baiahSkipEnabled !== false : row.baiah_skip_enabled !== false,
    updatedAt: (row.updated_at as string) || prev?.updatedAt || null
  };
}

// The full pyrotechnics: corner cannons + follow-up waves, with rolling
// haptics through the whole sequence (unless Android's native vibration
// pattern is already carrying the rumble). Returns timer ids for cleanup.
function fireCannons(instance: CreateTypes, timers: number[], { light = false, waveHaptics = true } = {}) {
  const colors = CONFETTI_COLORS;
  const scale = light ? 0.55 : 1;
  const corner = (x: number, angle: number, overrides: Record<string, unknown> = {}) =>
    instance({
      particleCount: Math.round(90 * scale),
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

  const waves: Array<{ delay: number; haptic: "light" | "medium" | "heavy"; run: () => void }> = [
    {
      delay: 200,
      haptic: "heavy",
      run: () => {
        corner(0, 55);
        corner(1, 125);
      }
    },
    {
      delay: 480,
      haptic: "medium",
      run: () => {
        corner(0.05, 72, { particleCount: Math.round(60 * scale), startVelocity: 72, scalar: 0.9 });
        corner(0.95, 108, { particleCount: Math.round(60 * scale), startVelocity: 72, scalar: 0.9 });
      }
    },
    {
      delay: 850,
      haptic: "heavy",
      run: () => {
        corner(0, 45);
        corner(1, 135);
        if (!light) {
          instance({
            particleCount: 120,
            spread: 170,
            startVelocity: 48,
            ticks: 260,
            origin: { x: 0.5, y: 1 },
            colors
          });
        }
      }
    },
    {
      delay: 1350,
      haptic: "medium",
      run: () => {
        corner(0.15, 62, { particleCount: Math.round(70 * scale), scalar: 1.15 });
        corner(0.85, 118, { particleCount: Math.round(70 * scale), scalar: 1.15 });
      }
    },
    {
      delay: 1900,
      haptic: "heavy",
      run: () => {
        corner(0, 60);
        corner(1, 120);
      }
    }
  ];

  const activeWaves = light ? waves.filter((wave) => wave.delay < 1300) : waves;
  for (const wave of activeWaves) {
    timers.push(
      window.setTimeout(() => {
        if (waveHaptics) {
          try {
            hapticImpact(wave.haptic);
          } catch {
            undefined;
          }
        }
        wave.run();
      }, wave.delay)
    );
  }
}

function BaiahTakeover() {
  const [settings, setSettings] = useState<BaiahSettings | null>(null);
  const [visible, setVisible] = useState(false);
  const [realtimeOk, setRealtimeOk] = useState(false);
  const [localTrigger, setLocalTrigger] = useState<{ startAt: string; firedAt: number } | null>(null);
  const [dismissedEpoch, setDismissedEpoch] = useState<string | null>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });
  const [needsTapForSound, setNeedsTapForSound] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiRef = useRef<CreateTypes | null>(null);
  const waveTimersRef = useRef<number[]>([]);
  const hapticEpochRef = useRef<string | null>(null);
  const lastTapRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initial read — direct REST so it works before sign-in and costs no
  // Vercel invocation.
  useEffect(() => {
    if (!hasRealtimeEnv()) return;
    let cancelled = false;
    fetchBaiahSettingsDirect()
      .then((next) => {
        if (!cancelled && next) setSettings(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime (best-effort — Supabase caps concurrent connections, so this is
  // a bonus path for as many devices as the plan allows).
  useEffect(() => {
    if (!hasRealtimeEnv()) return;
    const client = acquireRealtimeClient();
    if (!client) return;

    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    try {
      channel = client.channel("baiah-takeover");
      channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_settings" },
        (payload: { new?: Record<string, unknown> }) => {
          const row = payload?.new;
          if (!row) return;
          setSettings((prev) => mergeRealtimeRow(prev, row));
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
      try { channel?.unsubscribe(); } catch { undefined; }
      try { if (channel) client.removeChannel(channel); } catch { undefined; }
      releaseRealtimeClient();
    };
  }, []);

  // Poll fallback: 10s when Realtime is unavailable, 30s as a safety net when
  // it is. Skips hidden tabs; refreshes instantly when the tab wakes.
  useEffect(() => {
    if (!hasRealtimeEnv()) return;
    let cancelled = false;
    const intervalMs = realtimeOk ? 30000 : 10000;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      fetchBaiahSettingsDirect()
        .then((next) => {
          if (!cancelled && next) setSettings(next);
        })
        .catch(() => {});
    };
    const timer = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [realtimeOk]);

  // Local scheduled trigger: every device fires at the scheduled wall-clock
  // second, then the poll confirms (or cancels) within seconds.
  useEffect(() => {
    if (!settings || settings.isBaiahActive) return;
    const startAt = settings.baiahStartAt;
    if (!startAt) return;
    const epoch = `sched:${startAt}`;
    if (epoch === dismissedEpoch) return;
    const target = new Date(startAt).getTime();
    if (Number.isNaN(target)) return;
    const delay = target - Date.now();
    if (delay <= 0) {
      setLocalTrigger({ startAt, firedAt: Date.now() });
      return;
    }
    if (delay > LOCAL_ARM_HORIZON_MS) return;
    const timer = window.setTimeout(() => setLocalTrigger({ startAt, firedAt: Date.now() }), delay);
    return () => window.clearTimeout(timer);
  }, [settings, dismissedEpoch]);

  // Confirmation guard: if the schedule changed or was cancelled, drop the
  // local trigger; if the server activated, hand over to the real state.
  useEffect(() => {
    if (!localTrigger) return;
    if (settings?.isBaiahActive) {
      setLocalTrigger(null);
      return;
    }
    if (settings && settings.baiahStartAt !== localTrigger.startAt) {
      setLocalTrigger(null);
      return;
    }
    const safety = window.setTimeout(() => setLocalTrigger(null), 5 * 60 * 1000);
    return () => window.clearTimeout(safety);
  }, [localTrigger, settings]);

  // Visibility state machine + heavy haptic on each new activation epoch.
  useEffect(() => {
    const active = Boolean(settings?.isBaiahActive && !isExpired(settings));
    const activeEpoch = active ? epochFor(settings) : null;
    const localEpoch = localTrigger ? `sched:${localTrigger.startAt}` : null;
    const show = (active && activeEpoch !== dismissedEpoch) || (localEpoch !== null && localEpoch !== dismissedEpoch);

    setVisible(show);
    if (!show) return;
    const epoch = active ? activeEpoch : localEpoch;
    if (epoch && hapticEpochRef.current !== epoch) {
      hapticEpochRef.current = epoch;
      if (ANDROID_VIBRATE) {
        try {
          navigator.vibrate([150, 70, 180, 80, 240, 90, 320, 110, 420]);
        } catch {
          undefined;
        }
      }
      hapticImpact("heavy");
    }
  }, [settings, localTrigger, dismissedEpoch]);

  // Auto-hide cap per user.
  useEffect(() => {
    if (!visible) return;
    const startedAt = settings?.isBaiahActive && settings.baiahActivatedAt
      ? new Date(settings.baiahActivatedAt).getTime()
      : localTrigger?.firedAt ?? Date.now();
    const remaining = Math.max(0, startedAt + AUTO_HIDE_MS - Date.now());
    const timer = window.setTimeout(() => setVisible(false), remaining);
    return () => window.clearTimeout(timer);
  }, [visible, settings, localTrigger]);

  // Music: only fetched/played while the takeover is on screen.
  const songUrl = settings?.baiahSongUrl || DEFAULT_BAIAH_SONG_URL;
  const songWanted = visible && soundEnabled && settings?.baiahSongEnabled === true;

  useEffect(() => {
    if (!songWanted) {
      try {
        audioRef.current?.pause();
      } catch {
        undefined;
      }
      return;
    }
    let audio = audioRef.current;
    if (!audio || !audio.src.endsWith(songUrl)) {
      try {
        audio?.pause();
      } catch {
        undefined;
      }
      audio = new Audio(songUrl);
      audio.loop = true;
      audio.volume = 1;
      audioRef.current = audio;
    }
    try {
      const promise = audio.play();
      if (promise) {
        promise.then(() => setNeedsTapForSound(false)).catch(() => setNeedsTapForSound(true));
      }
    } catch {
      setNeedsTapForSound(true);
    }
  }, [songWanted, songUrl]);

  useEffect(
    () => () => {
      try {
        audioRef.current?.pause();
      } catch {
        undefined;
      }
      audioRef.current = null;
    },
    []
  );

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
    if (instance) fireCannons(instance, waveTimersRef.current, { light: PERF_LOW, waveHaptics: !ANDROID_VIBRATE });

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
  const skipEnabled = settings?.baiahSkipEnabled !== false;
  const currentEpoch = settings?.isBaiahActive ? epochFor(settings) : localTrigger ? `sched:${localTrigger.startAt}` : null;

  const ensureSound = () => {
    if (!soundEnabled) return;
    const audio = audioRef.current;
    if (!audio || !audio.paused) return;
    audio
      .play()
      .then(() => setNeedsTapForSound(false))
      .catch(() => setNeedsTapForSound(true));
  };

  const handleTap = (event: React.PointerEvent<HTMLDivElement>) => {
    ensureSound();
    const instance = confettiRef.current;
    if (!instance) return;
    const now = performance.now();
    if (now - lastTapRef.current < 55) return;
    lastTapRef.current = now;

    hapticImpact("medium");
    const x = event.clientX / Math.max(window.innerWidth, 1);
    const y = event.clientY / Math.max(window.innerHeight, 1);

    instance({
      particleCount: PERF_LOW ? 24 : 40,
      spread: 62,
      startVelocity: 34,
      scalar: 0.95,
      ticks: 170,
      origin: { x, y },
      colors: CONFETTI_COLORS
    });
    if (!PERF_LOW) {
      instance({
        particleCount: 18,
        spread: 360,
        startVelocity: 16,
        scalar: 0.7,
        ticks: 140,
        origin: { x, y },
        colors: CONFETTI_COLORS
      });
    }
  };

  const handleSkip = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (currentEpoch) {
      setDismissedEpoch(currentEpoch);
      try {
        localStorage.setItem(DISMISS_KEY, currentEpoch);
      } catch {
        undefined;
      }
    }
    setVisible(false);
    try {
      audioRef.current?.pause();
    } catch {
      undefined;
    }
    hapticImpact("light");
  };

  const toggleSound = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {
      undefined;
    }
    if (!next) {
      try {
        audioRef.current?.pause();
      } catch {
        undefined;
      }
    } else {
      ensureSound();
    }
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
      {skipEnabled && (
        <button
          type="button"
          className="baiah-skip"
          aria-label="Skip celebration"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={handleSkip}
        >
          Skip ✕
        </button>
      )}
      {settings?.baiahSongEnabled === true && (
        <button
          type="button"
          className={`baiah-sound ${soundEnabled ? "" : "off"}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={toggleSound}
        >
          {!soundEnabled ? "🔇 Muted" : needsTapForSound ? "🔊 Tap for sound" : "🔊 Sound"}
        </button>
      )}
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
