import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { getTelegramWebApp } from "../../../lib/telegram";

type RouteMapViewerProps = {
  mapAssetUrl: string;
  altText: string;
};

export function RouteMapViewer({ mapAssetUrl, altText }: RouteMapViewerProps) {
  const [imageError, setImageError] = useState(false);
  const [zoomed, setZoomed] = useState(false);

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
              tg.openLink(mapAssetUrl);
            } else {
              window.open(mapAssetUrl, "_blank");
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
        src={mapAssetUrl}
        alt={altText}
        className="map-image"
        loading="eager"
        draggable={false}
        onError={() => setImageError(true)}
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
