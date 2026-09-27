export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface Geocoder {
  readonly providerName: string;
  geocode(location: string): Promise<GeoPoint | null>;
}
