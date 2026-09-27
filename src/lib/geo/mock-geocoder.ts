// Fixed lookup table covering the Phase 1 mock dataset's cities. A real
// geocoder (Google Geocoding API, etc.) implements the same Geocoder
// interface and is swapped in via the provider factory — nothing that
// calls geocode() needs to change.

import type { Geocoder, GeoPoint } from "./types";

const KNOWN_LOCATIONS: Record<string, GeoPoint> = {
  "hattiesburg, ms": { lat: 31.3271, lon: -89.2903 },
  "hattiesburg": { lat: 31.3271, lon: -89.2903 },
  "midland, tx": { lat: 31.9973, lon: -102.0779 },
  "midland": { lat: 31.9973, lon: -102.0779 },
  "cape coral, fl": { lat: 26.5629, lon: -81.9495 },
  "cape coral": { lat: 26.5629, lon: -81.9495 },
};

export class MockGeocoder implements Geocoder {
  readonly providerName = "mock";

  async geocode(location: string): Promise<GeoPoint | null> {
    const key = location.trim().toLowerCase();
    if (KNOWN_LOCATIONS[key]) return KNOWN_LOCATIONS[key];

    // Fall back to a substring match so "Hattiesburg, Mississippi" or
    // "downtown Hattiesburg" still resolves for demo purposes.
    for (const [name, point] of Object.entries(KNOWN_LOCATIONS)) {
      if (key.includes(name) || name.includes(key)) return point;
    }
    return null;
  }
}
