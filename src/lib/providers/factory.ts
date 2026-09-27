// Single seam that picks the active business-data provider from env.
// Everything else in the app depends on the BusinessDataProvider
// interface, never on a concrete class — this is the only file that
// knows the mapping from config to implementation.

import type { BusinessDataProvider } from "./business-data/types";
import { MockBusinessDataProvider } from "./business-data/mock-provider";
import { GooglePlacesProvider } from "./business-data/google-places-provider";
import type { Geocoder } from "../geo/types";
import { MockGeocoder } from "../geo/mock-geocoder";
import type { WebsiteAuditProvider } from "./website-audit/types";
import { MockWebsiteAuditProvider } from "./website-audit/mock-provider";
import { RealWebsiteAuditProvider } from "./website-audit/real-provider";
import type { AiProposalProvider } from "./ai/types";
import { MockAiProposalProvider } from "./ai/mock-provider";
import { RealAiProposalProvider } from "./ai/real-provider";
import { ResilientAiProposalProvider } from "./ai/resilient-provider";

let cachedProvider: BusinessDataProvider | null = null;

export function getBusinessDataProvider(): BusinessDataProvider {
  if (cachedProvider) return cachedProvider;

  const providerName = (process.env.BUSINESS_DATA_PROVIDER ?? "mock").toLowerCase();

  switch (providerName) {
    case "google_places": {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        throw new Error(
          "BUSINESS_DATA_PROVIDER=google_places requires GOOGLE_PLACES_API_KEY to be set",
        );
      }
      cachedProvider = new GooglePlacesProvider(apiKey);
      break;
    }
    case "mock":
    default:
      cachedProvider = new MockBusinessDataProvider();
      break;
  }

  return cachedProvider;
}

let cachedGeocoder: Geocoder | null = null;

export function getGeocoder(): Geocoder {
  // Phase 2 ships only the mock geocoder. A real geocoder (Google
  // Geocoding API) is a direct drop-in behind the same interface —
  // add it here alongside GooglePlacesProvider when needed.
  if (!cachedGeocoder) cachedGeocoder = new MockGeocoder();
  return cachedGeocoder;
}

// Test-only: lets tests reset the memoized singletons between cases.
export function __resetProvidersForTests() {
  cachedProvider = null;
  cachedGeocoder = null;
  cachedAuditProvider = null;
  cachedAiProvider = null;
}

let cachedAuditProvider: WebsiteAuditProvider | null = null;

export function getWebsiteAuditProvider(): WebsiteAuditProvider {
  if (cachedAuditProvider) return cachedAuditProvider;

  const providerName = (process.env.WEBSITE_AUDIT_PROVIDER ?? "mock").toLowerCase();
  cachedAuditProvider = providerName === "real" ? new RealWebsiteAuditProvider() : new MockWebsiteAuditProvider();
  return cachedAuditProvider;
}

let cachedAiProvider: AiProposalProvider | null = null;

export function getAiProposalProvider(): AiProposalProvider {
  if (cachedAiProvider) return cachedAiProvider;

  const providerName = (process.env.AI_PROPOSAL_PROVIDER ?? "mock").toLowerCase();

  if (providerName === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("AI_PROPOSAL_PROVIDER=anthropic requires ANTHROPIC_API_KEY to be set");
    }
    const model = process.env.ANTHROPIC_MODEL || undefined;
    const real = model ? new RealAiProposalProvider(apiKey, model) : new RealAiProposalProvider(apiKey);
    // Always wrapped with the deterministic fallback — a live LLM call
    // failing or returning something invalid must never break the page.
    cachedAiProvider = new ResilientAiProposalProvider(real);
  } else {
    cachedAiProvider = new MockAiProposalProvider();
  }

  return cachedAiProvider;
}
