import type { Route } from "../types";
import { getVenue } from "../data/venues";
import { allMahallahs } from "../data/mahallahs";
import { kulliyyahs } from "../data/kulliyyahs";

function getDisplayName(code: string): string {
  const venue = getVenue(code);
  if (venue) return venue.shortName;
  const mahallah = allMahallahs.find((m) => m.code === code);
  if (mahallah) return mahallah.short;
  const k = kulliyyahs.find((k) => k.code === code);
  if (k) return k.short;
  return code;
}

type RouteSummaryBarProps = {
  route: Route;
};

export function RouteSummaryBar({ route }: RouteSummaryBarProps) {
  return (
    <div className="route-summary-bar">
      <div className="route-summary-venues">
        <span>{getDisplayName(route.fromCode)}</span>
        <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
          <path d="M2 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <polygon points="18,2 22,6 18,10" fill="currentColor" />
        </svg>
        <span>{getDisplayName(route.toCode)}</span>
      </div>
      <div className="route-summary-meta">
        <span>{route.durationMinutes} min</span>
        <span>{route.distanceMeters}m</span>
      </div>
    </div>
  );
}
