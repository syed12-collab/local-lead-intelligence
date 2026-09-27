// Real BusinessSearchProvider/BusinessDetailsProvider/ReviewProvider
// implementation against the Google Places API (New) — Text Search +
// Place Details.
//
// IMPORTANT — honesty note about this file's test status:
// This has NOT been exercised against the live Places API. This sandbox's
// network egress allowlist does not include googleapis.com, so no request
// from this class has actually been sent or observed to succeed here. The
// code follows the documented Places API (New) request/response shape,
// and unit tests cover the pure normalization logic against a fixture
// response (see tests/google-places-provider.test.ts), but end-to-end
// behavior against the real API is unverified. Test it against a real
// GOOGLE_PLACES_API_KEY before relying on it.
//
// Docs: https://developers.google.com/maps/documentation/places/web-service/text-search

import type {
  BusinessDataProvider,
  SearchBusinessesParams,
  ReviewSummary,
} from "./types";
import type { NormalizedBusiness, NormalizedContact, BusinessHours } from "@/types/domain";

const PLACES_BASE = "https://places.googleapis.com/v1";

const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.primaryTypeDisplayName",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.regularOpeningHours",
].join(",");

const DETAILS_FIELD_MASK = SEARCH_FIELD_MASK.replace(/^places\./gm, "").split(",").join(",");

interface PlacesApiPlace {
  id: string;
  displayName?: { text?: string };
  primaryTypeDisplayName?: { text?: string };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  formattedAddress?: string;
  addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>;
  location?: { latitude?: number; longitude?: number };
  regularOpeningHours?: {
    periods?: Array<{
      open?: { day?: number; hour?: number; minute?: number };
      close?: { day?: number; hour?: number; minute?: number };
    }>;
  };
}

const DAY_MAP: BusinessHours["day"][] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function normalizeHours(raw: PlacesApiPlace["regularOpeningHours"]): BusinessHours[] | null {
  if (!raw?.periods?.length) return null;
  const hours: BusinessHours[] = [];
  for (const period of raw.periods) {
    if (period.open?.day === undefined) continue;
    hours.push({
      day: DAY_MAP[period.open.day],
      open: period.open.hour !== undefined ? `${pad2(period.open.hour)}:${pad2(period.open.minute ?? 0)}` : null,
      close: period.close?.hour !== undefined ? `${pad2(period.close.hour)}:${pad2(period.close.minute ?? 0)}` : null,
    });
  }
  return hours.length > 0 ? hours : null;
}

function addressComponent(place: PlacesApiPlace, type: string): string | null {
  return place.addressComponents?.find((c) => c.types?.includes(type))?.longText ?? null;
}

// Maps a raw Places API result to our normalized shape. Every field is
// explicitly null when the API didn't return it — never guessed.
export function normalizePlace(place: PlacesApiPlace): NormalizedBusiness {
  const hasCoreFields = Boolean(place.displayName?.text);

  return {
    sourceBusinessId: place.id,
    source: "GOOGLE_PLACES",
    // Places API data for fields it actually returned is provider-confirmed.
    sourceConfidence: hasCoreFields ? "VERIFIED" : "NOT_VERIFIED",

    name: place.displayName?.text ?? "",
    category: place.primaryTypeDisplayName?.text ?? null,
    phone: place.nationalPhoneNumber ?? null,
    websiteUrl: place.websiteUri ?? null,
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? null,

    address: place.formattedAddress ?? null,
    city: addressComponent(place, "locality"),
    state: addressComponent(place, "administrative_area_level_1"),
    postalCode: addressComponent(place, "postal_code"),
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    hours: normalizeHours(place.regularOpeningHours),

    locationConfidence: place.location ? "VERIFIED" : "NOT_VERIFIED",
  };
}

export class GooglePlacesProvider implements BusinessDataProvider {
  readonly providerName = "google_places";
  private readonly apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GooglePlacesProvider requires a non-empty API key");
    }
    this.apiKey = apiKey;
  }

  async searchBusinesses(params: SearchBusinessesParams): Promise<NormalizedBusiness[]> {
    const res = await fetch(`${PLACES_BASE}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": SEARCH_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: `${params.keyword} in ${params.location}`,
        maxResultCount: Math.min(params.limit ?? 20, 20), // API max per page is 20
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Google Places search failed: ${res.status} ${body}`);
    }

    const data = (await res.json()) as { places?: PlacesApiPlace[] };
    return (data.places ?? []).map(normalizePlace);
  }

  async getBusinessDetails(sourceBusinessId: string): Promise<NormalizedBusiness | null> {
    const res = await fetch(`${PLACES_BASE}/places/${sourceBusinessId}`, {
      headers: {
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": DETAILS_FIELD_MASK,
      },
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Google Places details failed: ${res.status} ${body}`);
    }

    const place = (await res.json()) as PlacesApiPlace;
    return normalizePlace(place);
  }

  async getReviews(sourceBusinessId: string): Promise<ReviewSummary> {
    const business = await this.getBusinessDetails(sourceBusinessId);
    if (!business) return { rating: null, reviewCount: null, confidence: "NOT_VERIFIED" };
    return {
      rating: business.rating,
      reviewCount: business.reviewCount,
      confidence: business.sourceConfidence,
    };
  }

  async getContactData(businessWebsiteUrl: string | null): Promise<NormalizedContact[]> {
    // The Places API doesn't return email/WhatsApp — that's Phase-3+
    // ContactDiscoveryProvider territory (a permitted crawl of the site
    // itself). This never invents a contact the API didn't provide.
    void businessWebsiteUrl;
    return [];
  }
}
