// Composition layer: wires the provider abstractions + geo filtering +
// scoring engine into a single view model the UI can render.
//
// The active BusinessDataProvider comes from lib/providers/factory.ts
// (mock by default; set BUSINESS_DATA_PROVIDER=google_places + an API
// key to switch — see .env.example). Everything below depends only on
// the BusinessDataProvider/Geocoder interfaces, never a concrete class.
//
// Persistence: when DATABASE_URL is configured, search results are also
// upserted into Postgres via lib/db/repository.ts, best-effort — a
// persistence failure never breaks the page the user is looking at (see
// that module for why, and its untested-in-this-sandbox caveat).

import { getBusinessDataProvider, getGeocoder, getWebsiteAuditProvider, getAiProposalProvider } from "@/lib/providers/factory";
import { checkRobotsPermission } from "@/lib/providers/website-audit/robots";
import { calculateScores } from "@/lib/scoring/calculate";
import { withinRadius } from "@/lib/geo/distance";
import { persistSearchResults, getLeadStatusOverride } from "@/lib/db/repository";
import type { AuditFindingInput, NormalizedBusiness, ScoreBreakdown, ProposalDraft } from "@/types/domain";
import type { LeadSearchInput } from "@/lib/validation/schemas";

const auditProvider = getWebsiteAuditProvider();
const aiProvider = getAiProposalProvider();

// The mock audit provider works off a fixed fixture keyed by domain and
// was never meant to be gated by a real robots.txt fetch against a fake
// .example domain (which would always fail and hide every mock finding).
// The real provider must always go through an actual robots.txt check.
// This is the one place that distinction is made.
async function resolveCrawlPermission(websiteUrl: string): Promise<{ allowed: boolean; note: string }> {
  if (auditProvider.providerName === "mock") {
    return { allowed: true, note: "Mock audit mode — robots.txt not checked against fixture domains" };
  }
  return checkRobotsPermission(websiteUrl);
}

export interface LeadListItem {
  business: NormalizedBusiness;
  findingCount: number;
  scores: ScoreBreakdown;
  status: string; // LeadStatus enum value; "NEW"/"AUDITED" by default (derived from audit findings), or a CRM-set status (QUALIFIED, CONTACTED, WON, etc.) once persisted — see getLeadStatusOverride
}

export interface LeadDetail extends LeadListItem {
  findings: Array<AuditFindingInput & { id: string }>;
  proposal: ProposalDraft;
  crawlStatusNote: string;
}

export interface PaginatedLeads {
  items: LeadListItem[];
  total: number;
  page: number;
  pageSize: number;
  radiusApplied: boolean; // true if real lat/lon distance filtering ran (center geocoded)
}

async function buildLeadListItem(business: NormalizedBusiness): Promise<LeadListItem> {
  const hasWebsite = Boolean(business.websiteUrl);
  const auditResult = hasWebsite
    ? await (async () => {
        const permission = await resolveCrawlPermission(business.websiteUrl!);
        return auditProvider.auditWebsite({ websiteUrl: business.websiteUrl!, crawlAllowed: permission.allowed });
      })()
    : { findings: [], crawlStatusNote: "No website on file" };

  const scores = calculateScores(business, auditResult.findings);

  const derivedStatus = auditResult.findings.length > 0 ? "AUDITED" : "NEW";
  const statusOverride = await getLeadStatusOverride(business.source, business.sourceBusinessId);

  return {
    business,
    findingCount: auditResult.findings.length,
    scores,
    status: statusOverride ?? derivedStatus,
  };
}

async function applyRadiusFilter(
  results: NormalizedBusiness[],
  location: string,
  radiusMi: number,
): Promise<{ filtered: NormalizedBusiness[]; radiusApplied: boolean }> {
  const geocoder = getGeocoder();
  const center = await geocoder.geocode(location);

  if (!center) {
    // Can't verify distance without a resolvable center — fall back to
    // whatever the provider's own text match returned rather than
    // silently dropping results we can't evaluate.
    return { filtered: results, radiusApplied: false };
  }

  const filtered = results.filter((b) => {
    if (b.latitude == null || b.longitude == null) {
      // No coordinates to check — can't confirm it's in radius, but we
      // also won't fabricate a distance. Keep it out of a
      // radius-filtered result set rather than guess.
      return false;
    }
    return withinRadius({ lat: center.lat, lon: center.lon }, { lat: b.latitude, lon: b.longitude }, radiusMi);
  });

  return { filtered, radiusApplied: true };
}

export async function searchLeads(input: LeadSearchInput, userId?: string | null): Promise<PaginatedLeads> {
  const provider = getBusinessDataProvider();

  const rawResults = await provider.searchBusinesses({
    keyword: input.keyword,
    location: input.location,
    radiusMi: input.radiusMi,
    limit: 50, // fetch a working set, then paginate client-side of this call
  });

  const { filtered, radiusApplied } = await applyRadiusFilter(rawResults, input.location, input.radiusMi);

  const total = filtered.length;
  const start = (input.page - 1) * input.pageSize;
  const pageSlice = filtered.slice(start, start + input.pageSize);

  const items = await Promise.all(pageSlice.map(buildLeadListItem));

  // Best-effort persistence — never blocks or fails the search response.
  await persistSearchResults(input, filtered, userId).catch(() => {
    /* see lib/db/repository.ts: failures are logged there, not thrown here */
  });

  return { items, total, page: input.page, pageSize: input.pageSize, radiusApplied };
}

export async function listAllDemoLeads(): Promise<LeadListItem[]> {
  const provider = getBusinessDataProvider();
  const results = await provider.searchBusinesses({ keyword: "", location: "", radiusMi: 100, limit: 50 });
  return Promise.all(results.map(buildLeadListItem));
}

export async function getLeadDetail(sourceBusinessId: string): Promise<LeadDetail | null> {
  const provider = getBusinessDataProvider();
  const business = await provider.getBusinessDetails(sourceBusinessId);
  if (!business) return null;

  const hasWebsite = Boolean(business.websiteUrl);
  const auditResult = hasWebsite
    ? await (async () => {
        const permission = await resolveCrawlPermission(business.websiteUrl!);
        return auditProvider.auditWebsite({ websiteUrl: business.websiteUrl!, crawlAllowed: permission.allowed });
      })()
    : { findings: [], crawlStatusNote: "No website on file" };

  const findingsWithIds = auditResult.findings.map((f, i) => ({
    ...f,
    id: `${sourceBusinessId}-finding-${i}`,
  }));

  const scores = calculateScores(business, auditResult.findings);

  const proposal = await aiProvider.generateProposal({
    businessName: business.name,
    city: business.city,
    primaryCategory: business.category,
    findings: findingsWithIds,
  });

  const derivedStatus = findingsWithIds.length > 0 ? "AUDITED" : "NEW";
  const statusOverride = await getLeadStatusOverride(business.source, business.sourceBusinessId);

  return {
    business,
    findingCount: findingsWithIds.length,
    scores,
    status: statusOverride ?? derivedStatus,
    findings: findingsWithIds,
    proposal,
    crawlStatusNote: auditResult.crawlStatusNote,
  };
}
