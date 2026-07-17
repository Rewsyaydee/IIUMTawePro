import { getTelegramWebApp } from "./telegram";

export interface Coordinates {
  lat: number;
  lng: number;
}

export function calculateDistance(a: Coordinates, b: Coordinates): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aRad =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(aRad), Math.sqrt(1 - aRad));
  return R * c;
}

export function isWithinRadius(
  user: Coordinates,
  venue: Coordinates,
  radiusMeters = 200
): boolean {
  return calculateDistance(user, venue) <= radiusMeters;
}

function getTelegramLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    const webApp = getTelegramWebApp();
    const lm = webApp?.LocationManager;
    if (!lm || typeof lm.getLocation !== "function") {
      reject(new Error("NO_LOCATION_MANAGER"));
      return;
    }

    const requestLocation = () => {
      lm.getLocation((data) => {
        if (data && typeof data.latitude === "number" && typeof data.longitude === "number") {
          resolve({ lat: data.latitude, lng: data.longitude });
        } else {
          reject(new Error("Location permission denied. Please enable location access in Telegram settings."));
        }
      });
    };

    if (lm.isInited) {
      requestLocation();
    } else {
      lm.init(() => requestLocation());
    }
  });
}

function getBrowserLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }),
      (error) => reject(new Error(getGeoErrorMessage(error))),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

export function getCurrentPosition(): Promise<Coordinates> {
  return getTelegramLocation().catch((err) => {
    if (err?.message === "NO_LOCATION_MANAGER") {
      return getBrowserLocation();
    }
    throw err;
  });
}

function getGeoErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission denied. Please enable location access.";
    case error.POSITION_UNAVAILABLE:
      return "Location unavailable. Try again.";
    case error.TIMEOUT:
      return "Location request timed out. Check your connection.";
    default:
      return "Unable to get location.";
  }
}
