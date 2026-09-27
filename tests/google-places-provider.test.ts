import { describe, it, expect } from "vitest";
import { normalizePlace } from "@/lib/providers/business-data/google-places-provider";

// Fixture shaped like a real Places API (New) Text Search response item.
// This tests the pure normalization logic only — see the caveat in
// google-places-provider.ts about live-API testing not being possible
// in this sandbox.
const fixturePlace = {
  id: "ChIJ_fake_place_id",
  displayName: { text: "Example Dental Studio" },
  primaryTypeDisplayName: { text: "Dentist" },
  nationalPhoneNumber: "(601) 555-0100",
  websiteUri: "https://exampledentalstudio.test",
  rating: 4.5,
  userRatingCount: 77,
  formattedAddress: "123 Main St, Hattiesburg, MS 39401, USA",
  addressComponents: [
    { longText: "Hattiesburg", types: ["locality"] },
    { longText: "Mississippi", shortText: "MS", types: ["administrative_area_level_1"] },
    { longText: "39401", types: ["postal_code"] },
  ],
  location: { latitude: 31.32, longitude: -89.29 },
  regularOpeningHours: {
    periods: [{ open: { day: 1, hour: 9, minute: 0 }, close: { day: 1, hour: 17, minute: 0 } }],
  },
};

describe("normalizePlace", () => {
  it("maps a full Places API result to NormalizedBusiness with VERIFIED confidence", () => {
    const result = normalizePlace(fixturePlace);
    expect(result.name).toBe("Example Dental Studio");
    expect(result.source).toBe("GOOGLE_PLACES");
    expect(result.sourceConfidence).toBe("VERIFIED");
    expect(result.city).toBe("Hattiesburg");
    expect(result.state).toBe("Mississippi");
    expect(result.latitude).toBe(31.32);
    expect(result.hours).toEqual([{ day: "mon", open: "09:00", close: "17:00" }]);
  });

  it("never fabricates a field the API omitted — missing fields become null, not guessed", () => {
    const sparse = { id: "ChIJ_sparse", displayName: { text: "Sparse Biz" } };
    const result = normalizePlace(sparse);
    expect(result.phone).toBeNull();
    expect(result.websiteUrl).toBeNull();
    expect(result.rating).toBeNull();
    expect(result.city).toBeNull();
    expect(result.latitude).toBeNull();
    // No coordinates returned, so location confidence honestly reflects that.
    expect(result.locationConfidence).toBe("NOT_VERIFIED");
  });

  it("marks NOT_VERIFIED when even the display name is missing", () => {
    const broken = { id: "ChIJ_broken" };
    const result = normalizePlace(broken);
    expect(result.sourceConfidence).toBe("NOT_VERIFIED");
    expect(result.name).toBe("");
  });
});
