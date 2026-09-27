import type { WebsiteAuditProvider, WebsiteAuditRequest, WebsiteAuditResult } from "./types";
import { MOCK_FINDINGS_BY_DOMAIN } from "@/lib/data/mock-leads";

export class MockWebsiteAuditProvider implements WebsiteAuditProvider {
  readonly providerName = "mock";

  async auditWebsite(request: WebsiteAuditRequest): Promise<WebsiteAuditResult> {
    if (!request.crawlAllowed) {
      return {
        findings: [],
        crawlStatusNote: "Crawl skipped: not permitted by robots.txt",
      };
    }

    let domain: string;
    try {
      domain = new URL(request.websiteUrl).hostname;
    } catch {
      return { findings: [], crawlStatusNote: "Invalid website URL" };
    }

    const findings = MOCK_FINDINGS_BY_DOMAIN[domain] ?? [];
    return {
      findings,
      crawlStatusNote: findings.length > 0 ? "ok (mock)" : "no mock findings registered for domain",
    };
  }
}
