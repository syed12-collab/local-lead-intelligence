// Provider-agnostic business-data interfaces.
//
// Nothing in this codebase should assume a specific vendor (Google Places,
// Yelp Fusion, etc). Every provider — mock or real — implements these
// interfaces, and the app talks to the interfaces only.

import type { NormalizedBusiness, NormalizedContact } from "@/types/domain";

export interface SearchBusinessesParams {
  keyword: string;
  location: string;
  radiusMi: number;
  limit?: number;
}

export interface BusinessSearchProvider {
  readonly providerName: string;
  searchBusinesses(params: SearchBusinessesParams): Promise<NormalizedBusiness[]>;
}

export interface BusinessDetailsProvider {
  readonly providerName: string;
  getBusinessDetails(sourceBusinessId: string): Promise<NormalizedBusiness | null>;
}

export interface ReviewSummary {
  rating: number | null;
  reviewCount: number | null;
  confidence: "VERIFIED" | "OBSERVED" | "INFERRED" | "NOT_VERIFIED";
}

export interface ReviewProvider {
  readonly providerName: string;
  getReviews(sourceBusinessId: string): Promise<ReviewSummary>;
}

export interface ContactDiscoveryProvider {
  readonly providerName: string;
  getContactData(businessWebsiteUrl: string | null): Promise<NormalizedContact[]>;
}

// A provider bundle — a real integration (e.g. Google Places) may implement
// several of these on one class; the mock provider does too.
export interface BusinessDataProvider
  extends BusinessSearchProvider,
    BusinessDetailsProvider,
    ReviewProvider,
    ContactDiscoveryProvider {}
