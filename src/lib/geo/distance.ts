// Haversine great-circle distance — pure, no external dependency, fully
// unit-testable without a geocoding API. This is what real radius
// filtering runs on, once a provider returns lat/lng (mock data has
// approximate real-world coordinates already; see mock-leads.ts).

const EARTH_RADIUS_MI = 3958.8;

export function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MI * c;
}

export function withinRadius(
  center: { lat: number; lon: number },
  point: { lat: number; lon: number },
  radiusMi: number,
): boolean {
  return haversineMiles(center.lat, center.lon, point.lat, point.lon) <= radiusMi;
}
