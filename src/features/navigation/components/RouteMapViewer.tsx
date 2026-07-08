import { useState } from "react";

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
        <p>Map image not available</p>
        <span>Step-by-step directions are still available below.</span>
      </div>
    );
  }

  return (
    <div className={`map-viewer ${zoomed ? "map-viewer-zoomed" : ""}`}>
      <img
        src={mapAssetUrl}
        alt={altText}
        className="map-image"
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
