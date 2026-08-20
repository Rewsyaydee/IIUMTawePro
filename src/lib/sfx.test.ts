import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CueName, PackName } from "uisfx";

const { createUISFXMock } = vi.hoisted(() => ({
  createUISFXMock: vi.fn()
}));

vi.mock("uisfx", async (importOriginal) => {
  const actual = await importOriginal<typeof import("uisfx")>();
  return { ...actual, createUISFX: createUISFXMock };
});

import {
  SFX_PACK,
  __resetSfxForTests,
  __setStorageForTests,
  destroySfx,
  getSoundEnabled,
  getSoundVolume,
  getTypingEnabled,
  initSfx,
  playSfx,
  runWithLoop,
  setSoundEnabled,
  setSoundVolume,
  setTypingEnabled,
  startLoop,
  stopAllLoops,
  stopLoop,
  unlockSfx
} from "./sfx";
import { cueNames, packNames } from "uisfx";

type FakeHandle = { stop: () => void; ended: Promise<void> };

function makeHandle(): FakeHandle {
  return { stop: vi.fn<() => void>(), ended: Promise.resolve() };
}

function makeFakePlayer() {
  const plays: Array<{ cue: string; handle: FakeHandle }> = [];
  const state = { enabled: true, volume: 1, pack: "soft" as PackName, destroyed: false };
  return {
    plays,
    state,
    unlock: vi.fn(async () => true),
    play: vi.fn((cue: string) => {
      const handle = makeHandle();
      plays.push({ cue, handle });
      return handle;
    }),
    preload: vi.fn(async () => undefined),
    setPack: vi.fn((pack: PackName) => { state.pack = pack; }),
    getPack: () => state.pack,
    setVolume: vi.fn((value: number) => { state.volume = value; }),
    getVolume: () => state.volume,
    setEnabled: vi.fn((value: boolean) => { state.enabled = value; }),
    isEnabled: () => state.enabled,
    stopAll: vi.fn(() => {
      for (const play of plays) play.handle.stop();
    }),
    destroy: vi.fn(async () => { state.destroyed = true; })
  };
}

type FakePlayer = ReturnType<typeof makeFakePlayer>;

function makeMemoryStore() {
  const data = new Map<string, string>();
  return {
    data,
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    }
  };
}

type WindowMock = {
  listeners: Record<string, Array<{ fn: (event: unknown) => void; capture?: boolean }>>;
  window: { addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };
  document: { addEventListener: ReturnType<typeof vi.fn> };
};

function makeWindowMock(): WindowMock {
  const listeners: WindowMock["listeners"] = {};
  const windowAdd = vi.fn((type: string, fn: (event: unknown) => void, options?: { capture?: boolean }) => {
    (listeners[type] ||= []).push({ fn, capture: options?.capture });
  });
  const windowRemove = vi.fn((type: string, fn: (event: unknown) => void) => {
    listeners[type] = (listeners[type] || []).filter((entry) => entry.fn !== fn);
  });
  return {
    listeners,
    window: { addEventListener: windowAdd, removeEventListener: windowRemove },
    document: { addEventListener: vi.fn() }
  };
}

const QUEUED_CUES: CueName[] = [
  "success", "error", "warning", "blocked", "delete", "select", "toggle-on", "toggle-off",
  "check", "uncheck", "expand", "collapse", "swipe", "open", "close", "cancel", "copy",
  "send", "unlock", "purchase", "back", "retry", "processing", "scanning", "typing",
  "volume-change"
];

describe("sfx module", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    createUISFXMock.mockReset();
    __resetSfxForTests();
    __setStorageForTests(undefined);
  });

  it("is import-safe without a browser (SSR / node) and never creates a player at import", () => {
    expect(typeof window === "undefined" || window).toBeTruthy();
    expect(createUISFXMock).not.toHaveBeenCalled();
    expect(getSoundEnabled()).toBe(true);
    expect(getSoundVolume()).toBe(0.7);
    expect(getTypingEnabled()).toBe(false);
  });

  it("suppresses cues until a genuine user gesture unlocks audio", () => {
    const fake = makeFakePlayer();
    createUISFXMock.mockReturnValue(fake);

    expect(playSfx("success")).toBeNull();
    expect(createUISFXMock).not.toHaveBeenCalled();

    unlockSfx();
    const handle = playSfx("success");
    expect(handle).not.toBeNull();
    expect(createUISFXMock).toHaveBeenCalledTimes(1);
    expect(fake.play).toHaveBeenCalledWith("success", undefined);
  });

  it("creates the player with the selected pack, volume, and saved enabled state", () => {
    const fake = makeFakePlayer();
    createUISFXMock.mockReturnValue(fake);
    unlockSfx();
    expect(createUISFXMock).toHaveBeenCalledWith(
      expect.objectContaining({ pack: "soft", volume: 0.7, enabled: true })
    );
    expect(packNames.includes(SFX_PACK)).toBe(true);
  });

  it("registers unlock listeners exactly once across remounts (StrictMode) and removes them on unlock", () => {
    const mock = makeWindowMock();
    vi.stubGlobal("window", mock.window);
    vi.stubGlobal("document", mock.document);
    const fake = makeFakePlayer();
    createUISFXMock.mockReturnValue(fake);

    initSfx();
    initSfx();
    expect(mock.window.addEventListener).toHaveBeenCalledTimes(2);
    expect(mock.document.addEventListener).toHaveBeenCalledTimes(1);
    expect(mock.listeners.pointerdown).toHaveLength(1);
    expect(mock.listeners.keydown).toHaveLength(1);

    expect(playSfx("open")).toBeNull();
    mock.listeners.pointerdown[0].fn({});
    expect(playSfx("open")).not.toBeNull();
    expect(mock.listeners.pointerdown).toHaveLength(0);
    expect(mock.listeners.keydown).toHaveLength(0);
  });

  it("creates a single player across remounts", () => {
    createUISFXMock.mockReturnValue(makeFakePlayer());
    unlockSfx();
    unlockSfx();
    playSfx("open");
    expect(createUISFXMock).toHaveBeenCalledTimes(1);
  });

  it("persists the mute preference and applies it to the player, stopping loops", () => {
    const store = makeMemoryStore();
    __setStorageForTests(store);
    const fake = makeFakePlayer();
    createUISFXMock.mockReturnValue(fake);
    unlockSfx();

    const handle = startLoop("processing");
    expect(handle).not.toBeNull();

    setSoundEnabled(false);
    expect(store.getItem("tawepro-sfx-enabled")).toBe("0");
    expect(fake.setEnabled).toHaveBeenCalledWith(false);
    expect(handle!.stop).toHaveBeenCalled();
    expect(fake.stopAll).toHaveBeenCalled();

    setSoundEnabled(true);
    expect(store.getItem("tawepro-sfx-enabled")).toBe("1");
    expect(fake.setEnabled).toHaveBeenCalledWith(true);
  });

  it("respects the saved mute preference: no player, no unlock, no audio while muted", () => {
    const store = makeMemoryStore();
    store.setItem("tawepro-sfx-enabled", "0");
    __setStorageForTests(store);
    expect(getSoundEnabled()).toBe(false);

    const fake = makeFakePlayer();
    createUISFXMock.mockReturnValue(fake);
    unlockSfx();
    expect(createUISFXMock).not.toHaveBeenCalled();
    expect(playSfx("success")).toBeNull();

    setSoundEnabled(true);
    expect(createUISFXMock).toHaveBeenCalledTimes(1);
    expect(store.getItem("tawepro-sfx-enabled")).toBe("1");
  });

  it("persists volume and applies it to the player", () => {
    const store = makeMemoryStore();
    __setStorageForTests(store);
    const fake = makeFakePlayer();
    createUISFXMock.mockReturnValue(fake);
    unlockSfx();

    setSoundVolume(0.4);
    expect(store.getItem("tawepro-sfx-volume")).toBe("0.4");
    expect(fake.setVolume).toHaveBeenCalledWith(0.4);
    expect(getSoundVolume()).toBe(0.4);

    setSoundVolume(5);
    expect(getSoundVolume()).toBe(1);
  });

  it("gates typing sonification behind its own opt-in preference", () => {
    const mock = makeWindowMock();
    vi.stubGlobal("window", mock.window);
    vi.stubGlobal("document", mock.document);
    const fake = makeFakePlayer();
    createUISFXMock.mockReturnValue(fake);
    initSfx();
    unlockSfx();

    const inputHandler = mock.document.addEventListener.mock.calls.find(
      (call) => call[0] === "input"
    )?.[1] as (event: unknown) => void;
    expect(inputHandler).toBeTypeOf("function");

    inputHandler({ target: { tagName: "INPUT", type: "text" } });
    expect(fake.play).not.toHaveBeenCalled();

    setTypingEnabled(true);
    const store = makeMemoryStore();
    __setStorageForTests(store);
    setTypingEnabled(true);
    expect(store.getItem("tawepro-sfx-typing")).toBe("1");

    inputHandler({ target: { tagName: "INPUT", type: "text" } });
    inputHandler({ target: { tagName: "TEXTAREA" } });
    expect(fake.play).toHaveBeenCalledTimes(2);
    expect(fake.play).toHaveBeenCalledWith("typing", undefined);

    inputHandler({ target: { tagName: "INPUT", type: "checkbox" } });
    inputHandler({ target: { tagName: "INPUT", type: "range" } });
    inputHandler({ target: { tagName: "SELECT" } });
    expect(fake.play).toHaveBeenCalledTimes(2);
  });

  it("plays success only after resolution and error only after failure, stopping the loop in every path", async () => {
    const fake = makeFakePlayer();
    createUISFXMock.mockReturnValue(fake);
    unlockSfx();

    let resolveTask: (value: string) => void = () => undefined;
    const task = new Promise<string>((resolve) => { resolveTask = resolve; });

    const runPromise = runWithLoop("processing", () => task, { success: "success", error: "error" });
    expect(fake.play).toHaveBeenCalledWith("processing", undefined);
    expect(fake.play).not.toHaveBeenCalledWith("success", undefined);

    resolveTask("done");
    await expect(runPromise).resolves.toBe("done");
    expect(fake.play).toHaveBeenCalledWith("success", undefined);
    expect(fake.play).not.toHaveBeenCalledWith("error", undefined);
    const loopPlay = fake.plays.find((entry) => entry.cue === "processing");
    expect(loopPlay?.handle.stop).toHaveBeenCalled();
  });

  it("cleans up the loop and plays the error cue when the task rejects", async () => {
    const fake = makeFakePlayer();
    createUISFXMock.mockReturnValue(fake);
    unlockSfx();

    await expect(
      runWithLoop("scanning", () => Promise.reject(new Error("boom")), { success: "success", error: "error" })
    ).rejects.toThrow("boom");
    expect(fake.play).toHaveBeenCalledWith("error", undefined);
    expect(fake.play).not.toHaveBeenCalledWith("success", undefined);
    const loopPlay = fake.plays.find((entry) => entry.cue === "scanning");
    expect(loopPlay?.handle.stop).toHaveBeenCalled();
  });

  it("clears retained loop handles when stopped and when all loops are stopped", () => {
    const fake = makeFakePlayer();
    createUISFXMock.mockReturnValue(fake);
    unlockSfx();

    const first = startLoop("loading");
    const second = startLoop("processing");
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();

    stopLoop(first);
    expect(first!.stop).toHaveBeenCalled();
    expect(second!.stop).not.toHaveBeenCalled();

    stopAllLoops();
    expect(second!.stop).toHaveBeenCalled();
    expect(fake.stopAll).toHaveBeenCalled();
  });

  it("destroys the player once on app teardown and rebuilds it later", async () => {
    const fake = makeFakePlayer();
    createUISFXMock.mockReturnValue(fake);
    unlockSfx();
    playSfx("open");

    await destroySfx();
    expect(fake.destroy).toHaveBeenCalledTimes(1);

    expect(playSfx("open")).toBeNull();
    unlockSfx();
    playSfx("open");
    expect(createUISFXMock).toHaveBeenCalledTimes(2);
  });

  it("only uses cues that exist in the uisfx catalog", () => {
    for (const cue of QUEUED_CUES) {
      expect(cueNames.includes(cue), `cue ${cue} should exist in the catalog`).toBe(true);
    }
  });
});
