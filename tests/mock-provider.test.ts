import { describe, it, expect } from "vitest";
import { MockBusinessDataProvider } from "@/lib/providers/business-data/mock-provider";

describe("MockBusinessDataProvider", () => {
  const provider = new MockBusinessDataProvider();

  it("filters by keyword and location, matching the spec's example query", async () => {
    const results = await provider.searchBusinesses({
      keyword: "dentist",
      location: "Hattiesburg",
      radiusMi: 25,
    });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.category?.toLowerCase()).toContain("dentist");
      expect(r.city?.toLowerCase()).toBe("hattiesburg");
    }
  });

  it("returns no results for a keyword/location combination with no matches", async () => {
    const results = await provider.searchBusinesses({
      keyword: "dentist",
      location: "Nowhere, ZZ",
      radiusMi: 25,
    });
    expect(results).toHaveLength(0);
  });

  it("never fabricates a business — getBusinessDetails returns null for an unknown ID", async () => {
    const result = await provider.getBusinessDetails("does-not-exist");
    expect(result).toBeNull();
  });

  it("getContactData never invents an email that isn't in the fixture", async () => {
    const contacts = await provider.getContactData("https://pinebeltfamilydental.example");
    expect(contacts.every((c) => c.channel !== "EMAIL")).toBe(true);
  });
});
