import { useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

type RouteMapViewerProps = {
  mapAssetUrl: string;
  altText: string;
};

export function RouteMapViewer({ mapAssetUrl, altText }: RouteMapViewerProps) {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <div className="map-placeholder">
        <p>Map image not available</p>
        <span>Step-by-step directions are still available below.</span>
      </div>
    );
  }

  return (
    <div className="map-viewer">
      <TransformWrapper
        initialScale={1}
        minScale={0.8}
        maxScale={4}
        centerOnInit
        wheel={{ step: 0.5 }}
        panning={{ velocityDisabled: true }}
      >
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          contentStyle={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <img
            src={mapAssetUrl}
            alt={altText}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            draggable={false}
            onError={() => setImageError(true)}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
