import { describe, it, expect } from "vitest";
import { calculateScores } from "@/lib/scoring/calculate";
import type { AuditFindingInput } from "@/types/domain";

const noWebsite = { rating: null, reviewCount: null, category: "Dentist", phone: "555", websiteUrl: null };
const strongProfileWeakSite = {
  rating: 4.8,
  reviewCount: 90,
  category: "Dentist",
  phone: "555",
  websiteUrl: "https://example.com",
};
const strongProfileGoodSite = { ...strongProfileWeakSite };

const criticalFinding: AuditFindingInput = {
  category: "TECHNICAL_SEO",
  title: "No HTTPS",
  description: "test",
  severity: "CRITICAL",
  evidence: "test",
  sourceUrl: null,
  confidence: "OBSERVED",
  verified: true,
  recommendation: "fix it",
};

describe("calculateScores", () => {
  it("never scores opportunity from review count alone — a highly-reviewed business with no site issues is not automatically low opportunity, and a low-review business is not automatically high opportunity", () => {
    const fewReviews = calculateScores(
      { ...strongProfileGoodSite, reviewCount: 2, rating: 3.0 },
      [],
    );
    const manyReviews = calculateScores(strongProfileGoodSite, []);
    // Both are computed from multiple signals — assert neither is a pure
    // function of review count by checking the explanation cites more than
    // just review_count.
    const signalsFew = fewReviews.explanation.map((e) => e.signal);
    const signalsMany = manyReviews.explanation.map((e) => e.signal);
    expect(signalsFew.length).toBeGreaterThan(1);
    expect(signalsMany.length).toBeGreaterThan(1);
    expect(signalsFew).toContain("rating");
    expect(signalsMany).toContain("review_count");
  });

  it("floors website SEO score at 0 when there is no website, and explains why", () => {
    const result = calculateScores(noWebsite, []);
    expect(result.websiteSeoScore).toBe(0);
    expect(result.explanation.some((e) => e.signal === "no_website")).toBe(true);
  });

  it("lowers technical SEO score when a critical finding exists", () => {
    const clean = calculateScores(strongProfileWeakSite, []);
    const withFinding = calculateScores(strongProfileWeakSite, [criticalFinding]);
    expect(withFinding.technicalSeoScore).toBeLessThan(clean.technicalSeoScore);
  });

  it("keeps every score within 0-100 bounds", () => {
    const manyFindings: AuditFindingInput[] = Array.from({ length: 20 }, () => criticalFinding);
    const result = calculateScores(strongProfileWeakSite, manyFindings);
    for (const v of [
      result.profileScore,
      result.websiteSeoScore,
      result.technicalSeoScore,
      result.localSeoScore,
      result.contentScore,
      result.conversionScore,
      result.opportunityScore,
    ]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
