import { BookOpen, Building2, HeartPulse, Home, Map as MapIcon, MapPin } from "lucide-react";
import { campusOverviewUrl } from "../data/mapAssets";
import { venues } from "../data/venues";
import type { VenueCategory } from "../types";
import { RouteMapViewer } from "./RouteMapViewer";
import { EmptyState } from "../../../components/EmptyState";

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

      {visibleVenues.length === 0 && (
        <EmptyState icon={MapIcon} title="No venues loaded" body="Campus venue information will appear here." />
      )}
    </section>
  );
}

export default CampusMapPage;
