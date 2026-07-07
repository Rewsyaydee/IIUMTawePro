import type { Route } from "../types";
import { getVenue } from "../data/venues";

type RouteSummaryBarProps = {
  route: Route;
};

export function RouteSummaryBar({ route }: RouteSummaryBarProps) {
  const from = getVenue(route.fromCode);
  const to = getVenue(route.toCode);

  return (
    <div className="route-summary-bar">
      <div className="route-summary-venues">
        <span>{from?.shortName || route.fromCode}</span>
        <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
          <path d="M2 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <polygon points="18,2 22,6 18,10" fill="currentColor" />
        </svg>
        <span>{to?.shortName || route.toCode}</span>
      </div>
      <div className="route-summary-meta">
        <span>{route.durationMinutes} min</span>
        <span>{route.distanceMeters}m</span>
      </div>
    </div>
  );
}
