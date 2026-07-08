import { useEffect } from "react";
import { createPortal } from "react-dom";
import { MapPin, Navigation, X } from "lucide-react";
import type { Route } from "../types";
import { getVenue } from "../data/venues";
import { appleMapsUrl, googleMapsWalkingUrl, openExternalMap, wazeUrl } from "../utils/mapLinks";
import { RouteMapViewer } from "./RouteMapViewer";
import { RouteStepsList } from "./RouteStepsList";
import { RouteSummaryBar } from "./RouteSummaryBar";

type RoutePlannerModalProps = {
  route: Route;
  onClose: () => void;
};

export function RoutePlannerModal({ route, onClose }: RoutePlannerModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="route-planner-overlay" onClick={onClose}>
      <div
        className="route-planner-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="route-planner-header">
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close route planner">
            <X size={18} />
          </button>
          <h2>Route Planner</h2>
          <span />
        </div>

        <RouteSummaryBar route={route} />

        <RouteMapViewer
          mapAssetUrl={route.mapAssetUrl}
          altText={`Route from ${route.fromCode} to ${route.toCode}`}
        />

        <RouteStepsList route={route} />

        <DirectionsSection route={route} />
      </div>
    </div>,
    document.body
  );
}

function DirectionsSection({ route }: { route: Route }) {
  const from = getVenue(route.fromCode);
  const to = getVenue(route.toCode);
  const fromName = from?.name || route.fromCode;
  const toName = to?.name || route.toCode;

  return (
    <div className="directions-section">
      <h3>Get Directions</h3>
      <div className="directions-buttons">
        <button className="directions-btn" onClick={() => openExternalMap(googleMapsWalkingUrl(fromName, toName))}>
          <MapPin size={15} />
          <span>Google Maps</span>
        </button>
        <button className="directions-btn" onClick={() => openExternalMap(wazeUrl(toName))}>
          <Navigation size={15} />
          <span>Waze</span>
        </button>
        <button className="directions-btn" onClick={() => openExternalMap(appleMapsUrl(fromName, toName))}>
          <span style={{ fontSize: "16px", fontWeight: 900 }}>&#x2318;</span>
          <span>Apple Maps</span>
        </button>
      </div>
    </div>
  );
}
