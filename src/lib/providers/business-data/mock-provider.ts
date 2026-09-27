// Mock business-data provider.
//
// Lets the whole app run with zero external credentials. Returns a fixed,
// clearly-labeled demo dataset — never fabricated "real" data, and every
// record is honest about its own confidence level (mock data is tagged
// OBSERVED/NOT_VERIFIED as appropriate, never VERIFIED, since VERIFIED
// is reserved for data a real provider actually confirmed).

import type {
  BusinessDataProvider,
  SearchBusinessesParams,
  ReviewSummary,
} from "./types";
import type { NormalizedBusiness, NormalizedContact } from "@/types/domain";
import { MOCK_BUSINESSES } from "@/lib/data/mock-leads";

export class MockBusinessDataProvider implements BusinessDataProvider {
  readonly providerName = "mock";

  async searchBusinesses(params: SearchBusinessesParams): Promise<NormalizedBusiness[]> {
    const keyword = params.keyword.trim().toLowerCase();
    const location = params.location.trim().toLowerCase();

    // Mock "search" just filters the fixed demo set by keyword/category and
    // city text match, the way a real provider would filter server-side.
    const matches = MOCK_BUSINESSES.filter((b) => {
      const keywordMatch =
        keyword.length === 0 ||
        b.name.toLowerCase().includes(keyword) ||
        (b.category ?? "").toLowerCase().includes(keyword);
      const locationMatch =
        location.length === 0 ||
        (b.city ?? "").toLowerCase().includes(location) ||
        (b.state ?? "").toLowerCase().includes(location) ||
        location.includes((b.city ?? "___").toLowerCase());
      return keywordMatch && locationMatch;
    });

    const limited = matches.slice(0, params.limit ?? 25);
    // Deliberately not applying radiusMi — the mock provider has no real
    // geocoding. A real provider implementation is responsible for radius
    // filtering against actual coordinates.
    return limited;
  }

  async getBusinessDetails(sourceBusinessId: string): Promise<NormalizedBusiness | null> {
    return MOCK_BUSINESSES.find((b) => b.sourceBusinessId === sourceBusinessId) ?? null;
  }

  async getReviews(sourceBusinessId: string): Promise<ReviewSummary> {
    const business = MOCK_BUSINESSES.find((b) => b.sourceBusinessId === sourceBusinessId);
    if (!business) {
      return { rating: null, reviewCount: null, confidence: "NOT_VERIFIED" };
    }
    return {
      rating: business.rating,
      reviewCount: business.reviewCount,
      confidence: business.sourceConfidence,
    };
  }

  async getContactData(businessWebsiteUrl: string | null): Promise<NormalizedContact[]> {
    if (!businessWebsiteUrl) return [];
    const business = MOCK_BUSINESSES.find((b) => b.websiteUrl === businessWebsiteUrl);
    if (!business) return [];
    // Mock contact discovery: only returns what the fixed dataset declares,
    // never invents an email/phone that isn't in the demo record.
    const contacts: NormalizedContact[] = [];
    if (business.phone) {
      contacts.push({
        channel: "PHONE",
        value: business.phone,
        confidence: business.sourceConfidence,
        sourceUrl: business.websiteUrl,
      });
    }
    return contacts;
  }
}
