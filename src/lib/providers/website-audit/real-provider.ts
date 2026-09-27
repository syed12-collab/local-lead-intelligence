// Real WebsiteAuditProvider: fetches the page and runs the checks in
// checks.ts against it. Crawl permission is decided by the caller (see
// checkRobotsPermission in robots.ts, called from lib/leads/get-leads.ts)
// and passed in via crawlAllowed — this class refuses to fetch anything
// when it's false, regardless of what the caller might otherwise ask.
//
// TEST STATUS: the HTTP mechanics (fetch-page.ts, robots.ts) have been
// exercised against real domains reachable from this sandbox's network
// allowlist (github.com) — see tests/real-provider.integration.test.ts —
// proving the fetch/timeout/robots-parsing pipeline works against real
// HTTP responses. The finding checks themselves (checks.ts) are unit
// tested against fixture HTML. What is NOT verified from this sandbox:
// running the full pipeline against an arbitrary small-business website,
// since this environment cannot reach arbitrary domains. Test against a
// handful of real business sites before relying on this in production.

import type { WebsiteAuditProvider, WebsiteAuditRequest, WebsiteAuditResult } from "./types";
import { fetchPageHtml } from "./fetch-page";
import { runAllChecks } from "./checks";

export class RealWebsiteAuditProvider implements WebsiteAuditProvider {
  readonly providerName = "real";

  async auditWebsite(request: WebsiteAuditRequest): Promise<WebsiteAuditResult> {
    if (!request.crawlAllowed) {
      return { findings: [], crawlStatusNote: "Crawl skipped: not permitted by robots.txt" };
    }

    const { html, finalUrl, note } = await fetchPageHtml(request.websiteUrl);
    if (!html) {
      return { findings: [], crawlStatusNote: note };
    }

    const findings = runAllChecks(html, finalUrl ?? request.websiteUrl);
    return { findings, crawlStatusNote: `ok — ${findings.length} finding(s) from a live crawl` };
  }
}
