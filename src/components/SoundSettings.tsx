import { useSfxPreferences, playSfx, unlockSfx } from "../lib/sfx";

export function SoundSettings() {
  const { soundEnabled, volume, typingEnabled, setSoundEnabled, setSoundVolume, setTypingEnabled } =
    useSfxPreferences();

  const handleSoundToggle = () => {
    const next = !soundEnabled;
    if (!next) playSfx("toggle-off");
    setSoundEnabled(next);
    if (next) {
      unlockSfx();
      playSfx("toggle-on");
    }
  };

  return (
    <div className="account-sfx" aria-label="Sound preferences">
      <div className="account-sfx-row">
        <span className="account-sfx-label">Sound effects</span>
        <button
          type="button"
          className={`switch${soundEnabled ? " on" : ""}`}
          role="switch"
          aria-checked={soundEnabled}
          aria-label="Sound effects"
          onClick={handleSoundToggle}
        >
          <span className="switch-thumb" aria-hidden="true" />
        </button>
      </div>

      {soundEnabled && (
        <>
          <div className="account-sfx-row">
            <span className="account-sfx-label">Keyboard sounds</span>
            <button
              type="button"
              className={`switch${typingEnabled ? " on" : ""}`}
              role="switch"
              aria-checked={typingEnabled}
              aria-label="Keyboard sounds"
              onClick={() => {
                const next = !typingEnabled;
                setTypingEnabled(next);
                playSfx(next ? "toggle-on" : "toggle-off");
              }}
            >
              <span className="switch-thumb" aria-hidden="true" />
            </button>
          </div>

          <div className="account-sfx-row">
            <label className="account-sfx-label" htmlFor="sfx-volume">
              Sound volume
            </label>
            <input
              id="sfx-volume"
              className="account-sfx-volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              aria-label="Sound volume"
              onChange={(event) => {
                setSoundVolume(Number(event.target.value));
                playSfx("volume-change");
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
