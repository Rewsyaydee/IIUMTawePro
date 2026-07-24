import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight,
  ExternalLink,
  Image as ImageIcon,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Search
} from "lucide-react";
import { campusOverviewUrl } from "../data/mapAssets";
import { venues, getVenue } from "../data/venues";
import { allMahallahs } from "../data/mahallahs";
import { kulliyyahs } from "../data/kulliyyahs";
import type { Route } from "../types";
import { useRoutePlanner } from "../hooks/useRoutePlanner";
import { RouteMapViewer } from "./RouteMapViewer";
import { RouteStepsList } from "./RouteStepsList";
import { RouteSummaryBar } from "./RouteSummaryBar";
import { EmptyState } from "../../../components/EmptyState";
import {
  appleMapsUrl,
  googleMapsWalkingUrl,
  openExternalMap,
  wazeUrl
} from "../utils/mapLinks";

interface SelectOption {
  code: string;
  label: string;
  group: string;
  name: string;
}

function buildOptions(): SelectOption[] {
  const venueOptions: SelectOption[] = venues.map((v) => ({
    code: v.code,
    label: v.shortName,
    group: "Venues",
    name: v.name
  }));

  const kulliyyahOptions: SelectOption[] = kulliyyahs.map((k) => ({
    code: k.code,
    label: k.short,
    group: "Kulliyyahs",
    name: k.name
  }));

  const maleOptions: SelectOption[] = allMahallahs
    .filter((m) => m.zone === "male")
    .map((m) => ({
      code: m.code,
      label: m.short,
      group: "Mahallahs (Male)",
      name: m.name
    }));

  const femaleOptions: SelectOption[] = allMahallahs
    .filter((m) => m.zone === "female")
    .map((m) => ({
      code: m.code,
      label: m.short,
      group: "Mahallahs (Female)",
      name: m.name
    }));

  const mixedOptions: SelectOption[] = allMahallahs
    .filter((m) => m.zone === "mixed")
    .map((m) => ({
      code: m.code,
      label: m.short,
      group: "Mahallahs (Mixed)",
      name: m.name
    }));

  return [
    ...venueOptions,
    ...kulliyyahOptions,
    ...maleOptions,
    ...femaleOptions,
    ...mixedOptions
  ];
}

function groupOptions(options: SelectOption[]) {
  const groups = new Map<string, SelectOption[]>();
  for (const opt of options) {
    const list = groups.get(opt.group) || [];
    list.push(opt);
    groups.set(opt.group, list);
  }
  return groups;
}

function resolveDisplayName(code: string): string {
  const venue = getVenue(code);
  if (venue) return venue.name;
  const mahallah = allMahallahs.find((m) => m.code === code);
  if (mahallah) return mahallah.name;
  const k = kulliyyahs.find((k) => k.code === code);
  if (k) return k.name;
  return code;
}

function CampusMapPage() {
  const options = useMemo(() => buildOptions(), []);
  const grouped = useMemo(() => groupOptions(options), [options]);
  const { lookup } = useRoutePlanner();

  const [fromCode, setFromCode] = useState("");
  const [toCode, setToCode] = useState("");
  const [activeRoute, setActiveRoute] = useState<Route | null>(null);
  const [searched, setSearched] = useState(false);

  const handleFindRoute = () => {
    if (!fromCode || !toCode) return;
    setSearched(true);
    const found = lookup(fromCode, toCode);
    setActiveRoute(found || null);
  };

  const fromName = fromCode ? resolveDisplayName(fromCode) : "";
  const toName = toCode ? resolveDisplayName(toCode) : "";

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

      <div className="route-selector">
        <div className="route-selector-row">
          <div className="route-selector-field">
            <label className="route-selector-label">From</label>
            <select
              className="route-select"
              value={fromCode}
              onChange={(e) => {
                setFromCode(e.target.value);
                setSearched(false);
              }}
            >
              <option value="">Select origin...</option>
              {Array.from(grouped.entries()).map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <span className="route-selector-arrow">
            <ArrowLeftRight size={18} aria-hidden="true" />
          </span>

          <div className="route-selector-field">
            <label className="route-selector-label">To</label>
            <select
              className="route-select"
              value={toCode}
              onChange={(e) => {
                setToCode(e.target.value);
                setSearched(false);
              }}
            >
              <option value="">Select destination...</option>
              {Array.from(grouped.entries()).map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        <button
          className="route-find-button"
          type="button"
          disabled={!fromCode || !toCode}
          onClick={handleFindRoute}
        >
          <Search size={16} aria-hidden="true" />
          <span>Find Route</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {searched && fromCode && toCode && (
          <motion.div
            key={`${fromCode}-${toCode}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ display: "grid", gap: "14px" }}
          >
            {activeRoute ? (
              <>
                <RouteSummaryBar route={activeRoute} />

                <RouteMapViewer
                  mapAssetUrl={activeRoute.mapAssetUrl}
                  altText={`Route from ${activeRoute.fromCode} to ${activeRoute.toCode}`}
                />

                <RouteStepsList route={activeRoute} />

                {activeRoute.transitionNotes && (
                  <div className="route-transition-notes">
                    <p>{activeRoute.transitionNotes}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="route-placeholder">
                <div className="route-placeholder-image">
                  <ImageIcon size={48} aria-hidden="true" />
                  <p>Route image coming soon</p>
                  <span>
                    No pre-computed route available for{" "}
                    <strong>{resolveDisplayName(fromCode)}</strong> →{" "}
                    <strong>{resolveDisplayName(toCode)}</strong>.
                  </span>
                </div>
              </div>
            )}

            <div className="directions-section">
              <h3>Get Directions</h3>
              <div className="directions-buttons">
                <button
                  className="directions-btn"
                  onClick={() => openExternalMap(googleMapsWalkingUrl(fromName, toName))}
                >
                  <MapPin size={15} />
                  <span>Google Maps</span>
                </button>
                <button
                  className="directions-btn"
                  onClick={() => openExternalMap(wazeUrl(toName))}
                >
                  <Navigation size={15} />
                  <span>Waze</span>
                </button>
                <button
                  className="directions-btn"
                  onClick={() => openExternalMap(appleMapsUrl(fromName, toName))}
                >
                  <span style={{ fontSize: "16px", fontWeight: 900 }}>&#x2318;</span>
                  <span>Apple Maps</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!searched && (
        <EmptyState
          icon={Search}
          title="Select a route"
          body="Choose an origin and destination above to find walking directions."
        />
      )}
    </section>
  );
}

export default CampusMapPage;
