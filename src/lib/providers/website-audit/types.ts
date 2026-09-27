// Provider-agnostic website audit interface.
//
// A real implementation would fetch the page (respecting robots.txt),
// parse HTML/metadata/schema, and produce AuditFindingInput[]. Phase 1
// ships a MockWebsiteAuditProvider so the pipeline is exercised end to
// end without a live crawler.

import type { AuditFindingInput } from "@/types/domain";

export interface WebsiteAuditRequest {
  websiteUrl: string;
  crawlAllowed: boolean; // caller must have already checked robots.txt
}

export interface WebsiteAuditResult {
  findings: AuditFindingInput[];
  crawlStatusNote: string;
}

export interface WebsiteAuditProvider {
  readonly providerName: string;
  auditWebsite(request: WebsiteAuditRequest): Promise<WebsiteAuditResult>;
}
