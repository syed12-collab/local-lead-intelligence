// Scoring engine.
//
// Deliberately NOT "review count = score". Each sub-score is built from
// multiple observable signals, and every contributing signal is recorded
// in `explanation` so the UI can show WHY a score is what it is.

import type { AuditFindingInput, FindingSeverity, ScoreBreakdown, ScoreExplanationEntry } from "@/types/domain";
import type { NormalizedBusiness } from "@/types/domain";

const severityPenalty: Record<FindingSeverity, number> = {
  LOW: 3,
  MEDIUM: 8,
  HIGH: 15,
  CRITICAL: 25,
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function findingsIn(findings: AuditFindingInput[], category: string): AuditFindingInput[] {
  return findings.filter((f) => f.category === category);
}

function scoreFromFindings(
  findings: AuditFindingInput[],
  category: string,
  explanation: ScoreExplanationEntry[],
  label: string,
): number {
  const relevant = findingsIn(findings, category);
  let score = 100;
  for (const f of relevant) {
    score -= severityPenalty[f.severity];
  }
  score = clamp(score);

  explanation.push({
    signal: `${category.toLowerCase()}_findings`,
    weight: 1,
    value: `${relevant.length} finding(s)`,
    contribution:
      relevant.length === 0
        ? `No ${label} issues were found, so this score stays at the ceiling.`
        : `${relevant.length} ${label} issue(s) were found (${relevant
            .map((f) => f.severity.toLowerCase())
            .join(", ")}), lowering the score.`,
  });

  return score;
}

export function calculateProfileScore(
  business: Pick<NormalizedBusiness, "rating" | "reviewCount" | "category" | "phone" | "websiteUrl">,
  explanation: ScoreExplanationEntry[],
): number {
  // Profile score blends several signals — never review count alone.
  let score = 40; // baseline: listed at all

  if (business.category) {
    score += 10;
    explanation.push({
      signal: "category_present",
      weight: 0.15,
      value: business.category,
      contribution: "Business category is set, which helps local relevance.",
    });
  }

  if (business.phone) {
    score += 10;
    explanation.push({
      signal: "phone_present",
      weight: 0.15,
      value: business.phone,
      contribution: "A phone number is listed, improving contact accessibility.",
    });
  }

  if (business.websiteUrl) {
    score += 10;
    explanation.push({
      signal: "website_present",
      weight: 0.15,
      value: business.websiteUrl,
      contribution: "A website is listed at all — many local competitors have none.",
    });
  } else {
    explanation.push({
      signal: "website_present",
      weight: 0.15,
      value: "none",
      contribution: "No website on file — this alone is a major opportunity signal.",
    });
  }

  if (business.rating != null) {
    const ratingPoints = Math.round(((business.rating - 3) / 2) * 15); // 3.0 → 0, 5.0 → +15, 1.0 → -15
    score += ratingPoints;
    explanation.push({
      signal: "rating",
      weight: 0.2,
      value: String(business.rating),
      contribution: `Rating of ${business.rating} contributes ${ratingPoints >= 0 ? "+" : ""}${ratingPoints} points.`,
    });
  } else {
    explanation.push({
      signal: "rating",
      weight: 0.2,
      value: "NOT VERIFIED",
      contribution: "No rating data available — treated as neutral, not penalized.",
    });
  }

  if (business.reviewCount != null) {
    // Review count contributes, but capped low and log-scaled so it can never dominate.
    const reviewPoints = Math.min(15, Math.round(Math.log10(business.reviewCount + 1) * 6));
    score += reviewPoints;
    explanation.push({
      signal: "review_count",
      weight: 0.15,
      value: String(business.reviewCount),
      contribution: `${business.reviewCount} review(s) contributes +${reviewPoints} points (capped, log-scaled — never the dominant factor).`,
    });
  }

  return clamp(score);
}

export function calculateScores(
  business: Pick<NormalizedBusiness, "rating" | "reviewCount" | "category" | "phone" | "websiteUrl">,
  findings: AuditFindingInput[],
): ScoreBreakdown {
  const explanation: ScoreExplanationEntry[] = [];

  const profileScore = calculateProfileScore(business, explanation);
  const technicalSeoScore = scoreFromFindings(findings, "TECHNICAL_SEO", explanation, "technical SEO");
  const onPageScore = scoreFromFindings(findings, "ON_PAGE_SEO", explanation, "on-page SEO");
  const localSeoScore = scoreFromFindings(findings, "LOCAL_SEO", explanation, "local SEO");
  const contentScore = scoreFromFindings(findings, "CONTENT", explanation, "content");
  const conversionScore = scoreFromFindings(findings, "CONVERSION", explanation, "conversion");

  const websiteSeoScore = business.websiteUrl
    ? clamp((technicalSeoScore + onPageScore) / 2)
    : 0;

  if (!business.websiteUrl) {
    explanation.push({
      signal: "no_website",
      weight: 1,
      value: "none",
      contribution: "No website exists, so website SEO score is floored at 0 — this is itself the opportunity.",
    });
  }

  // Opportunity score is inverse-weighted: LOW audit scores + a reasonably
  // strong profile (i.e. a real, findable business) = high opportunity.
  // A business with no online footprint at all scores lower opportunity
  // than one with a weak-but-real website, since there's less concrete,
  // evidenced material to build outreach from without a site to audit.
  const auditAverage = business.websiteUrl
    ? Math.round((websiteSeoScore + localSeoScore + contentScore + conversionScore) / 4)
    : 35; // neutral placeholder when there's nothing to audit yet

  const opportunityScore = clamp(
    profileScore * 0.35 + (100 - auditAverage) * 0.65,
  );

  explanation.push({
    signal: "opportunity_composite",
    weight: 1,
    value: `profile=${profileScore}, audit_avg=${auditAverage}`,
    contribution:
      "Opportunity score weights a real, findable profile (35%) against how much audit headroom exists (65%) — a strong profile with weak SEO is the highest-opportunity combination.",
  });

  return {
    profileScore,
    websiteSeoScore,
    technicalSeoScore,
    localSeoScore,
    contentScore,
    conversionScore,
    opportunityScore,
    explanation,
  };
}
