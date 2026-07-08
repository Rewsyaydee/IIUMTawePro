import { useState } from "react";
import { BookOpen, Building2, HeartPulse, Home, Map as MapIcon, MapPin, Navigation, Route as RouteIcon } from "lucide-react";
import { campusOverviewUrl } from "../data/mapAssets";
import { venues, getVenue } from "../data/venues";
import { routes } from "../data/routes";
import type { Route, VenueCategory } from "../types";
import { useRoutePlanner } from "../hooks/useRoutePlanner";
import { RouteMapViewer } from "./RouteMapViewer";
import { RoutePlannerModal } from "./RoutePlannerModal";
import { EmptyState } from "../../../components/EmptyState";
import { appleMapsUrl, googleMapsWalkingUrl, openExternalMap, wazeUrl } from "../utils/mapLinks";

const categoryIcons: Record<VenueCategory, typeof MapPin> = {
  hall: Building2,
  mosque: BookOpen,
  clinic: HeartPulse,
  mahallah: Home,
  admin: Building2,
  open_area: MapPin
};

const categoryLabels: Record<VenueCategory, string> = {
  hall: "Halls & Auditoriums",
  mosque: "Mosques",
  clinic: "Health",
  mahallah: "Mahallahs",
  admin: "Admin",
  open_area: "Other"
};

function CampusMapPage() {
  const visibleVenues = venues.filter((v) => v.category !== "open_area" || v.code === "bus-stop");
  const categories = Array.from(new Set(visibleVenues.map((v) => v.category)));
  const { lookup } = useRoutePlanner();
  const [activeRoute, setActiveRoute] = useState<Route | null>(null);

  const routeData = activeRoute;

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Navigation</p>
          <h2>Campus Map</h2>
        </div>
        <span className="soft-chip">Offline ready</span>
      </div>

      <RouteMapViewer
        mapAssetUrl={campusOverviewUrl()}
        altText="IIUM Gombak Campus overview map with venue locations"
      />

      {categories.map((category) => (
        <div key={category}>
          <h3 className="map-category-heading">{categoryLabels[category]}</h3>
          <div className="map-venue-list">
            {visibleVenues
              .filter((v) => v.category === category)
              .map((venue) => {
                const Icon = categoryIcons[venue.category];
                return (
                  <article key={venue.id} className="map-venue-card">
                    <span className={`map-venue-icon map-venue-${venue.category}`}>
                      <Icon size={18} />
                    </span>
                    <div>
                      <strong>{venue.name}</strong>
                      <p>{venue.description}</p>
                    </div>
                  </article>
                );
              })}
          </div>
        </div>
      ))}

      <div>
        <h3 className="map-category-heading">Available Routes</h3>
        <div className="map-route-list">
          {routes.map((route) => {
            const from = getVenue(route.fromCode);
            const to = getVenue(route.toCode);
            const fromName = from?.name || route.fromCode;
            const toName = to?.name || route.toCode;

            return (
              <article key={route.id} className="map-route-card">
                <div className="map-route-card-main" onClick={() => setActiveRoute(route)}>
                  <span className="map-route-icon">
                    <RouteIcon size={18} />
                  </span>
                  <div className="map-route-info">
                    <strong>{from?.shortName || route.fromCode} → {to?.shortName || route.toCode}</strong>
                    <span>{route.durationMinutes} min · {route.distanceMeters}m</span>
                  </div>
                </div>
                <div className="map-route-actions">
                  <button className="map-route-nav-btn" type="button" onClick={() => setActiveRoute(route)}>
                    <Navigation size={14} />
                  </button>
                  <button className="map-route-gmaps-btn" type="button" onClick={() => openExternalMap(googleMapsWalkingUrl(fromName, toName))}>
                    <MapPin size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {visibleVenues.length === 0 && (
        <EmptyState icon={MapIcon} title="No venues loaded" body="Campus venue information will appear here." />
      )}

      {routeData && (
        <RoutePlannerModal route={routeData} onClose={() => setActiveRoute(null)} />
      )}
    </section>
  );
}

export default CampusMapPage;
