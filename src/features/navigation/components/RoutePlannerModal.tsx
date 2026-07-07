import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { Route } from "../types";
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
      </div>
    </div>,
    document.body
  );
}
