// Builds a one-page-per-section PDF audit report using pdf-lib (pure JS,
// no native dependencies or headless-browser requirement — safe to run
// in a serverless/edge-adjacent Node function).
//
// This lays out real data only: whatever's in the LeadDetail the caller
// passes in. It never adds narrative filler — a section with no findings
// says so plainly, matching the "no fake data" rule everywhere else in
// this app.

import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import type { LeadDetail } from "@/lib/leads/get-leads";

const PAGE_WIDTH = 612; // US Letter, points
const PAGE_HEIGHT = 792;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const INK = rgb(0.09, 0.11, 0.14);
const MUTED = rgb(0.36, 0.4, 0.44);
const RULE = rgb(0.85, 0.86, 0.85);

interface Cursor {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function ensureSpace(c: Cursor, needed: number) {
  if (c.y - needed < MARGIN) {
    c.page = c.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    c.y = PAGE_HEIGHT - MARGIN;
  }
}

function drawHeading(c: Cursor, text: string) {
  ensureSpace(c, 28);
  c.page.drawText(text, { x: MARGIN, y: c.y, size: 14, font: c.bold, color: INK });
  c.y -= 8;
  c.page.drawLine({
    start: { x: MARGIN, y: c.y },
    end: { x: PAGE_WIDTH - MARGIN, y: c.y },
    thickness: 0.75,
    color: RULE,
  });
  c.y -= 16;
}

function drawLabelValue(c: Cursor, label: string, value: string) {
  ensureSpace(c, 16);
  c.page.drawText(label, { x: MARGIN, y: c.y, size: 9, font: c.bold, color: MUTED });
  c.page.drawText(value, { x: MARGIN + 130, y: c.y, size: 9, font: c.regular, color: INK });
  c.y -= 15;
}

function drawParagraph(c: Cursor, text: string, size = 9) {
  const lines = wrapText(text, c.regular, size, CONTENT_WIDTH);
  for (const line of lines) {
    ensureSpace(c, 13);
    c.page.drawText(line, { x: MARGIN, y: c.y, size, font: c.regular, color: INK });
    c.y -= 13;
  }
}

export async function buildAuditPdf(lead: LeadDetail): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${lead.business.name} — SEO Audit`);
  doc.setProducer("Local Lead Intelligence");

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const c: Cursor = { doc, page, y: PAGE_HEIGHT - MARGIN, regular, bold };

  c.page.drawText(lead.business.name, { x: MARGIN, y: c.y, size: 20, font: bold, color: INK });
  c.y -= 22;
  c.page.drawText("Local SEO Audit Report", { x: MARGIN, y: c.y, size: 11, font: regular, color: MUTED });
  c.y -= 6;
  c.page.drawText(`Generated ${new Date().toISOString().slice(0, 10)}`, {
    x: MARGIN,
    y: c.y,
    size: 8,
    font: regular,
    color: MUTED,
  });
  c.y -= 26;

  drawHeading(c, "Business Information");
  drawLabelValue(c, "Category", lead.business.category ?? "NOT VERIFIED");
  drawLabelValue(c, "Address", lead.business.address ?? "NOT VERIFIED");
  drawLabelValue(
    c,
    "City / State",
    `${lead.business.city ?? "NOT VERIFIED"}, ${lead.business.state ?? ""} ${lead.business.postalCode ?? ""}`.trim(),
  );
  drawLabelValue(c, "Phone", lead.business.phone ?? "NOT VERIFIED");
  drawLabelValue(c, "Website", lead.business.websiteUrl ?? "NOT VERIFIED");
  drawLabelValue(c, "Rating / Reviews", `${lead.business.rating ?? "NOT VERIFIED"} (${lead.business.reviewCount ?? "NOT VERIFIED"} reviews)`);
  drawLabelValue(c, "Data Source", `${lead.business.source} (${lead.business.sourceConfidence})`);
  c.y -= 8;

  drawHeading(c, "Scores");
  drawLabelValue(c, "Profile Score", `${lead.scores.profileScore} / 100`);
  drawLabelValue(c, "Website SEO Score", `${lead.scores.websiteSeoScore} / 100`);
  drawLabelValue(c, "Technical SEO Score", `${lead.scores.technicalSeoScore} / 100`);
  drawLabelValue(c, "Local SEO Score", `${lead.scores.localSeoScore} / 100`);
  drawLabelValue(c, "Content Score", `${lead.scores.contentScore} / 100`);
  drawLabelValue(c, "Conversion Score", `${lead.scores.conversionScore} / 100`);
  drawLabelValue(c, "Opportunity Score", `${lead.scores.opportunityScore} / 100`);
  c.y -= 4;
  for (const entry of lead.scores.explanation) {
    drawParagraph(c, `• ${entry.contribution}`, 8);
  }
  c.y -= 8;

  const categories: Array<[string, string]> = [
    ["TECHNICAL_SEO", "Technical Issues"],
    ["ON_PAGE_SEO", "On-Page SEO"],
    ["LOCAL_SEO", "Local SEO Audit"],
    ["CONTENT", "Content Opportunities"],
    ["CONVERSION", "Conversion Issues"],
  ];

  for (const [category, title] of categories) {
    const items = lead.findings.filter((f) => f.category === category);
    drawHeading(c, title);
    if (items.length === 0) {
      drawParagraph(c, "No findings in this category.", 9);
    } else {
      for (const f of items) {
        ensureSpace(c, 16);
        c.page.drawText(`${f.title} [${f.severity}]`, { x: MARGIN, y: c.y, size: 10, font: bold, color: INK });
        c.y -= 13;
        drawParagraph(c, f.description);
        drawParagraph(c, `Evidence: ${f.evidence}`, 8);
        drawParagraph(c, `Verified: ${f.verified ? "true" : "NOT VERIFIED"}`, 8);
        drawParagraph(c, `Recommendation: ${f.recommendation}`, 8);
        c.y -= 6;
      }
    }
    c.y -= 4;
  }

  drawHeading(c, "AI Proposal Draft");
  drawParagraph(c, `Subject: ${lead.proposal.subject}`, 10);
  c.y -= 4;
  drawParagraph(c, lead.proposal.opening);
  c.y -= 4;
  for (const obs of lead.proposal.observations) {
    drawParagraph(c, `• ${obs.text}${obs.findingId === null ? " (not backed by a verified finding)" : ""}`, 9);
  }
  if (lead.proposal.solution) {
    c.y -= 4;
    drawParagraph(c, lead.proposal.solution);
  }
  if (lead.proposal.cta) {
    c.y -= 4;
    drawParagraph(c, lead.proposal.cta);
  }

  return doc.save();
}
