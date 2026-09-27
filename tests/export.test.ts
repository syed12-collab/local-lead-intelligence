import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/export/csv";
import { leadsToCsv } from "@/lib/export/leads-csv";
import { buildAuditPdf } from "@/lib/export/audit-pdf";
import { getLeadDetail } from "@/lib/leads/get-leads";

describe("toCsv", () => {
  it("produces a header row plus one row per record", () => {
    const csv = toCsv(
      [{ a: "1", b: 2 }, { a: "3", b: 4 }],
      [{ header: "A", value: (r) => r.a }, { header: "B", value: (r) => r.b }],
    );
    const lines = csv.trim().split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("A,B");
    expect(lines[1]).toBe("1,2");
  });

  it("quotes and escapes a value containing a comma", () => {
    const csv = toCsv([{ name: "Smith, Jones & Co" }], [{ header: "Name", value: (r) => r.name }]);
    expect(csv).toContain('"Smith, Jones & Co"');
  });

  it("doubles embedded quotes", () => {
    const csv = toCsv([{ name: 'The "Best" Dental' }], [{ header: "Name", value: (r) => r.name }]);
    expect(csv).toContain('"The ""Best"" Dental"');
  });

  it("quotes a value containing a newline", () => {
    const csv = toCsv([{ note: "line one\nline two" }], [{ header: "Note", value: (r) => r.note }]);
    expect(csv).toContain('"line one\nline two"');
  });

  it("renders null/undefined as an empty cell, not the string 'null'", () => {
    const csv = toCsv([{ a: null, b: undefined }], [{ header: "A", value: (r) => r.a }, { header: "B", value: (r) => r.b }]);
    const dataLine = csv.trim().split("\r\n")[1];
    expect(dataLine).toBe(",");
  });
});

describe("leadsToCsv", () => {
  it("produces a well-formed CSV for a real lead list, never the literal string NOT VERIFIED for a missing field", async () => {
    const { listAllDemoLeads } = await import("@/lib/leads/get-leads");
    const leads = await listAllDemoLeads();
    const csv = leadsToCsv(leads);
    const lines = csv.trim().split("\r\n");
    expect(lines.length).toBe(leads.length + 1); // header + one row per lead
    expect(lines[0]).toContain("Business Name");
    expect(lines[0]).toContain("Opportunity Score");
    // Hub City Dental Care has no website in the mock dataset — its
    // Website cell should be empty, not the UI-only "NOT VERIFIED" label.
    expect(csv).not.toContain("NOT VERIFIED");
  });
});

describe("buildAuditPdf", () => {
  it("produces a valid, loadable PDF with a page for a lead with findings", async () => {
    const lead = await getLeadDetail("mock-002"); // Southern Smiles — has mock findings
    expect(lead).not.toBeNull();
    const bytes = await buildAuditPdf(lead!);

    // A real PDF file signature — proves this isn't just bytes, but an
    // actual PDF structure.
    const header = Buffer.from(bytes.slice(0, 5)).toString("ascii");
    expect(header).toBe("%PDF-");

    // Round-trip it through pdf-lib's own loader to confirm it's valid
    // enough to be re-parsed, and has at least one page.
    const { PDFDocument } = await import("pdf-lib");
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("does not throw for a lead with no website/findings", async () => {
    const lead = await getLeadDetail("mock-003"); // Hub City Dental Care — no website in fixture
    expect(lead).not.toBeNull();
    await expect(buildAuditPdf(lead!)).resolves.toBeInstanceOf(Uint8Array);
  });
});

describe("leadExportInputSchema (regression: export must not be capped by UI pageSize)", () => {
  it("validates keyword/location/radiusMi without any pageSize field at all", async () => {
    const { leadExportInputSchema } = await import("@/lib/validation/schemas");
    const result = leadExportInputSchema.safeParse({ keyword: "dentist", location: "Hattiesburg, MS", radiusMi: 25 });
    expect(result.success).toBe(true);
  });

  it("searchLeads accepts a pageSize above the UI's 50-item cap when called directly (as the export route does)", async () => {
    const { searchLeads } = await import("@/lib/leads/get-leads");
    const result = await searchLeads({ keyword: "dentist", location: "Hattiesburg, MS", radiusMi: 25, page: 1, pageSize: 500 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.items.length).toBe(result.total); // everything fit on the one export "page"
  });
});
