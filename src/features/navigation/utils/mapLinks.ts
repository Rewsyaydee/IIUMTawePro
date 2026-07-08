import { getTelegramWebApp } from "../../../lib/telegram";

export function openExternalMap(url: string) {
  const tg = getTelegramWebApp();
  if (tg?.openLink) {
    tg.openLink(url);
  } else {
    window.open(url, "_blank");
  }
}

export function googleMapsWalkingUrl(from: string, to: string): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=walking`;
}

export function wazeUrl(destination: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`;
}

export function appleMapsUrl(from: string, to: string): string {
  return `https://maps.apple.com/?saddr=${encodeURIComponent(from)}&daddr=${encodeURIComponent(to)}&dirflg=w`;
}
