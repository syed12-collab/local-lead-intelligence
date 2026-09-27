// Shared domain types, mirroring prisma enums for use in code that runs
// before/without a generated Prisma client (e.g. provider modules, tests).

export type DataConfidence = "VERIFIED" | "OBSERVED" | "INFERRED" | "NOT_VERIFIED";

export type DataSource = "MOCK" | "GOOGLE_PLACES" | "YELP_FUSION" | "MANUAL" | "OTHER";

export type LeadStatus =
  | "NEW"
  | "QUEUED_FOR_AUDIT"
  | "AUDITED"
  | "QUALIFIED"
  | "CONTACTED"
  | "RESPONDED"
  | "WON"
  | "LOST"
  | "DISQUALIFIED";

export type FindingCategory =
  | "TECHNICAL_SEO"
  | "ON_PAGE_SEO"
  | "LOCAL_SEO"
  | "CONTENT"
  | "CONVERSION"
  | "MOBILE_UX"
  | "SCHEMA"
  | "METADATA"
  | "ACCESSIBILITY";

export type FindingSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ContactChannel = "EMAIL" | "PHONE" | "WHATSAPP" | "CONTACT_FORM" | "SOCIAL";

export interface BusinessHours {
  day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  open: string | null; // "09:00" or null if closed
  close: string | null;
}

// The normalized shape every business-data provider must return.
// Nothing here is guaranteed present — absence means NOT_VERIFIED, never a guess.
export interface NormalizedBusiness {
  sourceBusinessId: string;
  source: DataSource;
  sourceConfidence: DataConfidence;

  name: string;
  category: string | null;
  phone: string | null;
  websiteUrl: string | null;
  rating: number | null;
  reviewCount: number | null;

  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  hours: BusinessHours[] | null;

  locationConfidence: DataConfidence;
}

export interface NormalizedContact {
  channel: ContactChannel;
  value: string;
  confidence: DataConfidence;
  sourceUrl: string | null;
}

export interface AuditFindingInput {
  category: FindingCategory;
  title: string;
  description: string;
  severity: FindingSeverity;
  evidence: string;
  sourceUrl: string | null;
  confidence: DataConfidence;
  verified: boolean;
  recommendation: string;
}

export interface ScoreBreakdown {
  profileScore: number;
  websiteSeoScore: number;
  technicalSeoScore: number;
  localSeoScore: number;
  contentScore: number;
  conversionScore: number;
  opportunityScore: number;
  explanation: ScoreExplanationEntry[];
}

export interface ScoreExplanationEntry {
  signal: string; // e.g. "review_count", "meta_description_present"
  weight: number; // relative weight in the composite (0-1)
  value: string; // human-readable observed value
  contribution: string; // plain-language sentence: why this moved the score
}

export interface ProposalObservation {
  text: string;
  findingId: string | null; // null only for MOCK-mode UI demos; real proposals must reference a finding
}

export interface ProposalDraft {
  subject: string;
  opening: string;
  observations: ProposalObservation[];
  solution: string;
  cta: string;
  signature: string;
}
