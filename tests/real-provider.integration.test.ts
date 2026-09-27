// Integration tests against a REAL, live network target — not a fixture.
//
// This sandbox's network egress allowlist doesn't include arbitrary
// domains (no real small-business site is reachable from here), but
// github.com IS reachable. That's enough to genuinely prove the fetch
// pipeline — HTTP request, timeout handling, robots.txt fetch/parse,
// HTML parsing — works against a real server and real responses,
// rather than only ever having been exercised against strings we wrote
// ourselves. This is NOT a substitute for testing against a handful of
// real small-business sites before production use (see real-provider.ts).

import { describe, it, expect } from "vitest";
import { checkRobotsPermission } from "@/lib/providers/website-audit/robots";
import { fetchPageHtml } from "@/lib/providers/website-audit/fetch-page";
import { runAllChecks } from "@/lib/providers/website-audit/checks";
import { RealWebsiteAuditProvider } from "@/lib/providers/website-audit/real-provider";

describe("checkRobotsPermission (live network)", () => {
  it("fetches and parses github.com's real robots.txt without throwing", async () => {
    const result = await checkRobotsPermission("https://github.com", "/");
    expect(typeof result.allowed).toBe("boolean");
    expect(result.note.length).toBeGreaterThan(0);
  }, 15000);

  it("treats an unresolvable domain as not permitted rather than crashing", async () => {
    const result = await checkRobotsPermission("https://this-domain-should-not-resolve-lli-test.invalid", "/");
    expect(result.allowed).toBe(false);
  }, 15000);
});

describe("fetchPageHtml (live network)", () => {
  it("fetches a real page from github.com and returns non-empty HTML", async () => {
    const result = await fetchPageHtml("https://github.com/about");
    expect(result.html).not.toBeNull();
    expect(result.html!.length).toBeGreaterThan(500);
    expect(result.note).toBe("ok");
  }, 15000);

  it("returns null html for an unresolvable domain, with an explanatory note, rather than throwing", async () => {
    const result = await fetchPageHtml("https://this-domain-should-not-resolve-lli-test.invalid/");
    expect(result.html).toBeNull();
    expect(result.note.length).toBeGreaterThan(0);
  }, 15000);
});

describe("RealWebsiteAuditProvider end-to-end (live network)", () => {
  it("runs the full fetch -> parse -> findings pipeline against a real page without crashing", async () => {
    const provider = new RealWebsiteAuditProvider();
    const result = await provider.auditWebsite({ websiteUrl: "https://github.com/about", crawlAllowed: true });
    // github.com/about is a real, well-built page — we're not asserting
    // specific findings (that would be asserting on someone else's site
    // never changing), only that the pipeline runs end to end and
    // produces a well-formed result.
    expect(Array.isArray(result.findings)).toBe(true);
    expect(result.crawlStatusNote).toMatch(/^ok/);
    for (const f of result.findings) {
      expect(f.evidence.length).toBeGreaterThan(0);
      expect(f.sourceUrl).toBeTruthy();
    }
  }, 15000);

  it("refuses to fetch anything when crawlAllowed is false", async () => {
    const provider = new RealWebsiteAuditProvider();
    const result = await provider.auditWebsite({ websiteUrl: "https://github.com/about", crawlAllowed: false });
    expect(result.findings).toHaveLength(0);
    expect(result.crawlStatusNote).toMatch(/not permitted/i);
  });
});

describe("runAllChecks (sanity against real fetched HTML)", () => {
  it("does not throw when run against a real, large real-world page", async () => {
    const { html } = await fetchPageHtml("https://github.com/about");
    expect(html).not.toBeNull();
    expect(() => runAllChecks(html!, "https://github.com/about")).not.toThrow();
  }, 15000);
});
