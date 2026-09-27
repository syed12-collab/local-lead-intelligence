import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getBusinessDataProvider, getAiProposalProvider, __resetProvidersForTests } from "@/lib/providers/factory";
import { MockBusinessDataProvider } from "@/lib/providers/business-data/mock-provider";
import { GooglePlacesProvider } from "@/lib/providers/business-data/google-places-provider";
import { MockAiProposalProvider } from "@/lib/providers/ai/mock-provider";
import { ResilientAiProposalProvider } from "@/lib/providers/ai/resilient-provider";

const ORIGINAL_ENV = { ...process.env };

describe("getBusinessDataProvider", () => {
  beforeEach(() => {
    __resetProvidersForTests();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    __resetProvidersForTests();
  });

  it("defaults to the mock provider when BUSINESS_DATA_PROVIDER is unset", () => {
    delete process.env.BUSINESS_DATA_PROVIDER;
    const provider = getBusinessDataProvider();
    expect(provider).toBeInstanceOf(MockBusinessDataProvider);
  });

  it("selects Google Places when configured with an API key", () => {
    process.env.BUSINESS_DATA_PROVIDER = "google_places";
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
    const provider = getBusinessDataProvider();
    expect(provider).toBeInstanceOf(GooglePlacesProvider);
  });

  it("throws a clear error when google_places is selected without an API key", () => {
    process.env.BUSINESS_DATA_PROVIDER = "google_places";
    delete process.env.GOOGLE_PLACES_API_KEY;
    expect(() => getBusinessDataProvider()).toThrow(/GOOGLE_PLACES_API_KEY/);
  });
});

describe("getAiProposalProvider", () => {
  beforeEach(() => {
    __resetProvidersForTests();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    __resetProvidersForTests();
  });

  it("defaults to the mock provider when AI_PROPOSAL_PROVIDER is unset", () => {
    delete process.env.AI_PROPOSAL_PROVIDER;
    const provider = getAiProposalProvider();
    expect(provider).toBeInstanceOf(MockAiProposalProvider);
  });

  it("wraps the real provider in a resilient fallback when configured with a key", () => {
    process.env.AI_PROPOSAL_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "test-key";
    const provider = getAiProposalProvider();
    expect(provider).toBeInstanceOf(ResilientAiProposalProvider);
  });

  it("throws a clear error when anthropic is selected without an API key", () => {
    process.env.AI_PROPOSAL_PROVIDER = "anthropic";
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => getAiProposalProvider()).toThrow(/ANTHROPIC_API_KEY/);
  });
});
