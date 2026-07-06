export function LoadingScreen({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "loading-screen loading-compact" : "loading-screen"} aria-live="polite" aria-label="Loading IIUM Ta'aruf Week">
      <div className="loading-mark-wrap">
        <span className="loading-ring" aria-hidden="true" />
        <img className="loading-logo" src="/assets/iium-logo.png" alt="" />
      </div>
      <div className="loading-copy">
        <p className="eyebrow">Garden of Knowledge and Virtue</p>
        <strong>IIUM Ta'aruf Week</strong>
        <span>Preparing your event companion</span>
      </div>
      <div className="loading-line" aria-hidden="true" />
    </div>
  );
}
