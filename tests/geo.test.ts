import { describe, it, expect } from "vitest";
import { haversineMiles, withinRadius } from "@/lib/geo/distance";
import { MockGeocoder } from "@/lib/geo/mock-geocoder";

describe("haversineMiles", () => {
  it("returns ~0 for the same point", () => {
    expect(haversineMiles(31.3271, -89.2903, 31.3271, -89.2903)).toBeCloseTo(0, 5);
  });

  it("returns a sensible distance between Hattiesburg and Midland (~750mi as the crow flies)", () => {
    const d = haversineMiles(31.3271, -89.2903, 31.9973, -102.0779);
    expect(d).toBeGreaterThan(700);
    expect(d).toBeLessThan(800);
  });
});

describe("withinRadius", () => {
  it("is true for a point well inside the radius", () => {
    const center = { lat: 31.3271, lon: -89.2903 };
    const nearby = { lat: 31.3298, lon: -89.3211 }; // Hub City Dental Care, same city
    expect(withinRadius(center, nearby, 25)).toBe(true);
  });

  it("is false for a point far outside the radius", () => {
    const center = { lat: 31.3271, lon: -89.2903 }; // Hattiesburg
    const farAway = { lat: 31.9973, lon: -102.0779 }; // Midland, TX
    expect(withinRadius(center, farAway, 25)).toBe(false);
  });
});

describe("MockGeocoder", () => {
  const geocoder = new MockGeocoder();

  it("resolves a known city, state pair", async () => {
    const point = await geocoder.geocode("Hattiesburg, MS");
    expect(point).not.toBeNull();
    expect(point!.lat).toBeCloseTo(31.3271, 2);
  });

  it("resolves via substring match for a looser input", async () => {
    const point = await geocoder.geocode("downtown Hattiesburg");
    expect(point).not.toBeNull();
  });

  it("returns null for a location it has no data for", async () => {
    const point = await geocoder.geocode("Nowhere, ZZ");
    expect(point).toBeNull();
  });
});
