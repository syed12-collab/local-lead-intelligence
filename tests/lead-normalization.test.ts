import { describe, it, expect } from "vitest";
import { searchLeads, getLeadDetail } from "@/lib/leads/get-leads";

describe("lead composition layer", () => {
  it("produces a full lead detail with scores, findings, and a proposal for a known business", async () => {
    const detail = await getLeadDetail("mock-002"); // Southern Smiles — has mock findings
    expect(detail).not.toBeNull();
    expect(detail!.findings.length).toBeGreaterThan(0);
    expect(detail!.scores.opportunityScore).toBeGreaterThanOrEqual(0);
    expect(detail!.proposal.subject).toBeTruthy();
    // Every observation must trace back to a real finding ID that exists
    // in the findings list — never a floating, unverified claim.
    const findingIds = new Set(detail!.findings.map((f) => f.id));
    for (const obs of detail!.proposal.observations) {
      if (obs.findingId !== null) {
        expect(findingIds.has(obs.findingId)).toBe(true);
      }
    }
  });

  it("returns null for an unknown lead rather than fabricating one", async () => {
    const detail = await getLeadDetail("nonexistent-id");
    expect(detail).toBeNull();
  });

  it("search results are deduplicated by sourceBusinessId", async () => {
    const result = await searchLeads({ keyword: "dentist", location: "Hattiesburg", radiusMi: 25, page: 1, pageSize: 50 });
    const ids = result.items.map((r) => r.business.sourceBusinessId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("applies real radius filtering when the location geocodes, and paginates results", async () => {
    const result = await searchLeads({ keyword: "dentist", location: "Hattiesburg, MS", radiusMi: 25, page: 1, pageSize: 2 });
    expect(result.radiusApplied).toBe(true);
    expect(result.items.length).toBeLessThanOrEqual(2);
    expect(result.total).toBeGreaterThan(0);
  });

  it("excludes businesses outside the requested radius once a center is resolved", async () => {
    // Midland, TX garage door business should not appear in a Hattiesburg, MS search radius
    const result = await searchLeads({ keyword: "", location: "Hattiesburg, MS", radiusMi: 25, page: 1, pageSize: 50 });
    const names = result.items.map((r) => r.business.name);
    expect(names).not.toContain("Coastal Garage Door Repair");
  });
});
