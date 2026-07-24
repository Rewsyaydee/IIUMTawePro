import { getTelegramWebApp } from "../../../lib/telegram";
import { getLocationCoord, hasExactCoords } from "../data/locations";

export function openExternalMap(url: string) {
  const tg = getTelegramWebApp();
  if (tg?.openLink) {
    tg.openLink(url);
  } else {
    window.open(url, "_blank");
  }
}

function coordString(code: string): string {
  const loc = getLocationCoord(code);
  if (!loc || loc.lat === null || loc.lng === null) return encodeURIComponent(code);
  return encodeURIComponent(`${loc.lat},${loc.lng}`);
}

export function googleMapsWalkingUrl(from: string, to: string): string {
  const origin = hasExactCoords(from) ? coordString(from) : encodeURIComponent(from);
  const dest = hasExactCoords(to) ? coordString(to) : encodeURIComponent(to);
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=walking`;
}

export function wazeUrl(destination: string): string {
  if (hasExactCoords(destination)) {
    const coord = coordString(destination);
    return `https://waze.com/ul?ll=${coord}&navigate=yes`;
  }
  return `https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`;
}

export function appleMapsUrl(from: string, to: string): string {
  const origin = hasExactCoords(from) ? coordString(from) : encodeURIComponent(from);
  const dest = hasExactCoords(to) ? coordString(to) : encodeURIComponent(to);
  return `https://maps.apple.com/?saddr=${origin}&daddr=${dest}&dirflg=w`;
}
