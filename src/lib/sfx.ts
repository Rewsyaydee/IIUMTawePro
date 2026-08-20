import { useEffect, useReducer } from "react";
import {
  createUISFX,
  type CueName,
  type PackName,
  type PlayOptions,
  type PlayingSFX,
  type UISFXPlayer
} from "uisfx";
import { isLowPerformance } from "./deviceInfo";

export const SFX_PACK: PackName = "soft";

const ENABLED_KEY = "tawepro-sfx-enabled";
const VOLUME_KEY = "tawepro-sfx-volume";
const TYPING_KEY = "tawepro-sfx-typing";
const DEFAULT_VOLUME = 0.7;

export type LoopCue = Extract<
  CueName,
  "loading" | "processing" | "recording" | "connecting" | "scanning" | "streaming"
>;

type KVStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

let player: UISFXPlayer | null = null;
let unlocked = false;
let initialized = false;
let enabled: boolean | undefined;
let volume = DEFAULT_VOLUME;
let typingEnabled: boolean | undefined;
let storage: KVStorage | undefined;
const loops = new Set<PlayingSFX>();
const listeners = new Set<() => void>();

function getStorage(): KVStorage | undefined {
  if (storage) return storage;
  if (typeof window === "undefined") return undefined;
  try {
    storage = window.localStorage;
    return storage;
  } catch {
    return undefined;
  }
}

function readPref(name: string): string | null {
  try {
    return getStorage()?.getItem(name) ?? null;
  } catch {
    return null;
  }
}

function persist(name: string, value: string) {
  try {
    getStorage()?.setItem(name, value);
  } catch {
    // Storage may be unavailable (private mode, sandbox) — audio still works for the session.
  }
}

function emit() {
  for (const listener of [...listeners]) listener();
}

function loadPrefs() {
  if (enabled !== undefined && typingEnabled !== undefined) return;
  if (enabled === undefined) {
    const raw = readPref(ENABLED_KEY);
    enabled = raw === null ? !isLowPerformance() : raw === "1";
  }
  const rawVolume = readPref(VOLUME_KEY);
  if (rawVolume !== null) {
    const parsed = Number(rawVolume);
    if (Number.isFinite(parsed)) volume = Math.max(0, Math.min(1, parsed));
  }
  if (typingEnabled === undefined) {
    typingEnabled = readPref(TYPING_KEY) === "1";
  }
}

function ensurePlayer(): UISFXPlayer {
  if (!player) {
    loadPrefs();
    player = createUISFX({
      pack: SFX_PACK,
      volume,
      enabled: enabled ?? true
    });
  }
  return player;
}

export function initSfx() {
  if (initialized) return;
  initialized = true;
  if (typeof window === "undefined") return;

  const unlock = () => {
    unlocked = true;
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
    if (getSoundEnabled()) {
      void ensurePlayer()
        .unlock()
        .then((ok) => {
          if (!ok) unlocked = false;
        })
        .catch(() => {
          unlocked = false;
        });
    }
  };
  window.addEventListener("pointerdown", unlock, { capture: true });
  window.addEventListener("keydown", unlock, true);
  document.addEventListener("input", handleTypingInput, true);
}

export function unlockSfx() {
  if (!getSoundEnabled()) return;
  unlocked = true;
  void ensurePlayer()
    .unlock()
    .then((ok) => {
      if (!ok) unlocked = false;
    })
    .catch(() => {
      unlocked = false;
    });
}

export function playSfx(cue: CueName, options?: PlayOptions): PlayingSFX | null {
  if (!unlocked || !getSoundEnabled()) return null;
  return ensurePlayer().play(cue, options);
}

export function startLoop(cue: LoopCue): PlayingSFX | null {
  const handle = playSfx(cue);
  if (handle) loops.add(handle);
  return handle;
}

export function stopLoop(handle: PlayingSFX | null | undefined) {
  if (!handle) return;
  loops.delete(handle);
  handle.stop();
}

export function stopAllLoops() {
  for (const handle of [...loops]) {
    loops.delete(handle);
    handle.stop();
  }
  player?.stopAll();
}

export async function runWithLoop<T>(
  loopCue: LoopCue,
  fn: () => Promise<T>,
  outcomes: { success?: CueName; error?: CueName } = {}
): Promise<T> {
  const handle = startLoop(loopCue);
  try {
    const result = await fn();
    stopLoop(handle);
    if (outcomes.success) playSfx(outcomes.success);
    return result;
  } catch (err) {
    stopLoop(handle);
    if (outcomes.error) playSfx(outcomes.error);
    throw err;
  }
}

export function getSoundEnabled(): boolean {
  loadPrefs();
  return enabled ?? true;
}

export function setSoundEnabled(value: boolean) {
  loadPrefs();
  enabled = value;
  persist(ENABLED_KEY, value ? "1" : "0");
  if (value) {
    ensurePlayer().setEnabled(true);
  } else if (player) {
    stopAllLoops();
    player.setEnabled(false);
  }
  emit();
}

export function getSoundVolume(): number {
  loadPrefs();
  return volume;
}

export function setSoundVolume(value: number) {
  volume = Math.max(0, Math.min(1, Number.isFinite(value) ? value : DEFAULT_VOLUME));
  persist(VOLUME_KEY, String(volume));
  if (player) player.setVolume(volume);
  emit();
}

export function getTypingEnabled(): boolean {
  loadPrefs();
  return typingEnabled ?? false;
}

export function setTypingEnabled(value: boolean) {
  typingEnabled = value;
  persist(TYPING_KEY, value ? "1" : "0");
  emit();
}

function handleTypingInput(event: Event) {
  if (!getTypingEnabled()) return;
  const target = event.target as HTMLElement | null;
  if (!target) return;
  const tag = target.tagName;
  if (tag !== "INPUT" && tag !== "TEXTAREA") return;
  if (tag === "INPUT") {
    const type = (target as HTMLInputElement).type;
    if (["checkbox", "radio", "range", "color", "file", "button", "submit"].includes(type)) return;
  }
  playSfx("typing");
}

export function useSfxPreferences() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
    };
  }, []);
  return {
    soundEnabled: getSoundEnabled(),
    volume: getSoundVolume(),
    typingEnabled: getTypingEnabled(),
    setSoundEnabled,
    setSoundVolume,
    setTypingEnabled
  };
}

export async function destroySfx() {
  stopAllLoops();
  const instance = player;
  player = null;
  unlocked = false;
  if (instance) {
    await instance.destroy();
  }
}

export function __resetSfxForTests() {
  storage = undefined;
  player = null;
  unlocked = false;
  initialized = false;
  enabled = undefined;
  volume = DEFAULT_VOLUME;
  typingEnabled = undefined;
  loops.clear();
  listeners.clear();
}

export function __setStorageForTests(next: KVStorage | undefined) {
  storage = next;
  enabled = undefined;
  volume = DEFAULT_VOLUME;
  typingEnabled = undefined;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    void destroySfx();
  });
}
