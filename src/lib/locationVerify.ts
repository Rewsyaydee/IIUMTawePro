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

export function getCurrentPosition(): Promise<Coordinates> {
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
