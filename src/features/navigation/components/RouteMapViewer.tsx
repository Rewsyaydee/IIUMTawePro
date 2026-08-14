import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { getTelegramWebApp } from "../../../lib/telegram";

type RouteMapViewerProps = {
  mapAssetUrl: string;
  altText: string;
};

// iOS Telegram Mini Apps (WKWebView) can refuse relative/CORS-less image loads.
// Resolve to an absolute HTTPS URL, add explicit CORS-friendly attributes, and
// retry once with a cache-busting query before falling back.
function resolveAbsoluteUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return url;
  }
}

export function RouteMapViewer({ mapAssetUrl, altText }: RouteMapViewerProps) {
  const [imageError, setImageError] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [retryBust, setRetryBust] = useState(0);

  const src = useMemo(() => {
    const absolute = resolveAbsoluteUrl(mapAssetUrl);
    return retryBust > 0 ? `${absolute}${absolute.includes("?") ? "&" : "?"}retry=${retryBust}` : absolute;
  }, [mapAssetUrl, retryBust]);

  if (imageError) {
    return (
      <div className="map-placeholder">
        <p>Map image cannot load in Mini App</p>
        <span>Step-by-step directions are still available below.</span>
        <button
          className="primary-button"
          style={{ marginTop: "8px" }}
          type="button"
          onClick={() => {
            const tg = getTelegramWebApp();
            if (tg?.openLink) {
              tg.openLink(src);
            } else {
              window.open(src, "_blank");
            }
          }}
        >
          <ExternalLink size={14} />
          <span>Open in browser</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`map-viewer ${zoomed ? "map-viewer-zoomed" : ""}`}>
      <img
        src={src}
        alt={altText}
        className="map-image"
        loading="eager"
        draggable={false}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        onError={() => {
          // One retry with a cache-busting query, then show the fallback.
          if (retryBust === 0) {
            setRetryBust(1);
          } else {
            setImageError(true);
          }
        }}
        onClick={() => setZoomed(!zoomed)}
      />
      <button
        className="map-zoom-toggle"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setZoomed(!zoomed);
        }}
      >
        {zoomed ? "Fit" : "Zoom"}
      </button>
    </div>
  );
}
