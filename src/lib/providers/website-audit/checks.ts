// Pure audit-check functions: (parsed HTML, page URL) -> AuditFindingInput[].
//
// Each function is independently unit-testable against a fixture HTML
// string — no network involved. This is where "never fabricate an SEO
// problem" is structurally enforced: every finding here is derived from
// something actually present or absent in the fetched HTML, with the
// exact evidence recorded.

import * as cheerio from "cheerio";
import type { AuditFindingInput } from "@/types/domain";

type CheerioDoc = ReturnType<typeof cheerio.load>;

function finding(partial: Omit<AuditFindingInput, "confidence" | "verified">): AuditFindingInput {
  return { ...partial, confidence: "OBSERVED", verified: true };
}

export function checkTechnicalSeo(html: string, url: string): AuditFindingInput[] {
  const $ = cheerio.load(html);
  const findings: AuditFindingInput[] = [];

  if (!url.startsWith("https://")) {
    findings.push(
      finding({
        category: "TECHNICAL_SEO",
        title: "Site not served over HTTPS",
        description: "The page was loaded over plain HTTP rather than HTTPS.",
        severity: "CRITICAL",
        evidence: `Page URL: ${url}`,
        sourceUrl: url,
        recommendation: "Install an SSL certificate and force HTTPS redirects site-wide.",
      }),
    );
  }

  const metaDescription = $('meta[name="description"]').attr("content")?.trim();
  if (!metaDescription) {
    findings.push(
      finding({
        category: "TECHNICAL_SEO",
        title: "Missing meta description",
        description: "The page's <head> has no meta description tag.",
        severity: "MEDIUM",
        evidence: "No <meta name=\"description\"> element found in <head>.",
        sourceUrl: url,
        recommendation: "Add a unique, keyword-relevant meta description to the homepage.",
      }),
    );
  } else if (metaDescription.length < 50) {
    findings.push(
      finding({
        category: "TECHNICAL_SEO",
        title: "Meta description is very short",
        description: `The meta description is only ${metaDescription.length} characters.`,
        severity: "LOW",
        evidence: `Observed content: "${metaDescription}"`,
        sourceUrl: url,
        recommendation: "Expand the meta description to 120-160 characters, describing the primary service and location.",
      }),
    );
  }

  const viewport = $('meta[name="viewport"]').attr("content");
  if (!viewport) {
    findings.push(
      finding({
        category: "TECHNICAL_SEO",
        title: "Missing responsive viewport tag",
        description: "No <meta name=\"viewport\"> tag was found, which usually means the page isn't optimized for mobile rendering.",
        severity: "HIGH",
        evidence: "No <meta name=\"viewport\"> element found in <head>.",
        sourceUrl: url,
        recommendation: "Add a responsive viewport meta tag and verify the layout on mobile widths.",
      }),
    );
  }

  const canonical = $('link[rel="canonical"]').attr("href");
  if (!canonical) {
    findings.push(
      finding({
        category: "TECHNICAL_SEO",
        title: "Missing canonical link tag",
        description: "No canonical URL is declared for this page.",
        severity: "LOW",
        evidence: "No <link rel=\"canonical\"> element found in <head>.",
        sourceUrl: url,
        recommendation: "Add a self-referencing canonical tag to avoid duplicate-content ambiguity.",
      }),
    );
  }

  const images = $("img");
  const imagesWithoutAlt = images.filter((_, el) => !$(el).attr("alt")?.trim()).length;
  if (images.length > 0 && imagesWithoutAlt > 0) {
    findings.push(
      finding({
        category: "TECHNICAL_SEO",
        title: "Images missing alt text",
        description: `${imagesWithoutAlt} of ${images.length} <img> elements have no alt attribute.`,
        severity: imagesWithoutAlt === images.length ? "MEDIUM" : "LOW",
        evidence: `${imagesWithoutAlt}/${images.length} <img> tags observed with a missing or empty alt attribute.`,
        sourceUrl: url,
        recommendation: "Add descriptive alt text to every meaningful image for accessibility and image search.",
      }),
    );
  }

  return findings;
}

export function checkOnPageSeo(html: string, url: string): AuditFindingInput[] {
  const $ = cheerio.load(html);
  const findings: AuditFindingInput[] = [];

  const title = $("title").first().text().trim();
  if (!title) {
    findings.push(
      finding({
        category: "ON_PAGE_SEO",
        title: "Missing title tag",
        description: "The page has no <title> element.",
        severity: "CRITICAL",
        evidence: "No <title> element found in <head>.",
        sourceUrl: url,
        recommendation: "Add a unique, descriptive <title> including the primary service and city.",
      }),
    );
  } else if (title.length < 15) {
    findings.push(
      finding({
        category: "ON_PAGE_SEO",
        title: "Title tag is very short / likely just the business name",
        description: `The page title is "${title}" (${title.length} characters), with no apparent service or location keywords.`,
        severity: "MEDIUM",
        evidence: `Observed <title>: "${title}"`,
        sourceUrl: url,
        recommendation: "Rewrite the title tag to include the primary service plus city/region.",
      }),
    );
  }

  const h1s = $("h1");
  if (h1s.length === 0) {
    findings.push(
      finding({
        category: "ON_PAGE_SEO",
        title: "Missing H1 heading",
        description: "The page has no <h1> element.",
        severity: "MEDIUM",
        evidence: "No <h1> element found on the page.",
        sourceUrl: url,
        recommendation: "Add a single, clear <h1> stating the primary service and location.",
      }),
    );
  } else if (h1s.length > 1) {
    findings.push(
      finding({
        category: "ON_PAGE_SEO",
        title: "Multiple H1 headings",
        description: `${h1s.length} <h1> elements were found on the page.`,
        severity: "LOW",
        evidence: `Observed ${h1s.length} <h1> elements.`,
        sourceUrl: url,
        recommendation: "Use a single <h1> per page for a clear content hierarchy.",
      }),
    );
  }

  return findings;
}

export function checkLocalSeo(html: string, url: string): AuditFindingInput[] {
  const $ = cheerio.load(html);
  const findings: AuditFindingInput[] = [];

  const jsonLdBlocks = $('script[type="application/ld+json"]');
  let hasLocalBusinessSchema = false;
  jsonLdBlocks.each((_, el) => {
    const raw = $(el).contents().text();
    try {
      const parsed = JSON.parse(raw);
      const types = Array.isArray(parsed) ? parsed.map((p) => p["@type"]) : [parsed["@type"]];
      if (types.some((t) => typeof t === "string" && /local business|dentist|store|organization|professionalservice/i.test(t))) {
        hasLocalBusinessSchema = true;
      }
    } catch {
      // Malformed JSON-LD — treated as absent rather than crashing the audit.
    }
  });

  if (!hasLocalBusinessSchema) {
    findings.push(
      finding({
        category: "LOCAL_SEO",
        title: "No LocalBusiness structured data found",
        description: "No JSON-LD schema identifying this as a local business was found on the page.",
        severity: "MEDIUM",
        evidence:
          jsonLdBlocks.length > 0
            ? `${jsonLdBlocks.length} JSON-LD block(s) present, but none declared a LocalBusiness-type @type.`
            : "No <script type=\"application/ld+json\"> elements found on the page.",
        sourceUrl: url,
        recommendation: "Add LocalBusiness JSON-LD schema with name, address, phone, and hours.",
      }),
    );
  }

  const bodyText = $("body").text();
  const phonePattern = /(\(\d{3}\)\s?\d{3}-\d{4}|\d{3}[-.\s]\d{3}[-.\s]\d{4})/;
  if (!phonePattern.test(bodyText)) {
    findings.push(
      finding({
        category: "LOCAL_SEO",
        title: "No phone number found in page text",
        description: "No phone-number-shaped text was found anywhere on the page.",
        severity: "HIGH",
        evidence: "No pattern matching a US phone number format was found in the page body text.",
        sourceUrl: url,
        recommendation: "Display the business phone number in plain text on every page, ideally in the header/footer.",
      }),
    );
  }

  return findings;
}

export function checkContent(html: string, url: string): AuditFindingInput[] {
  const $ = cheerio.load(html);
  const findings: AuditFindingInput[] = [];

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText.length === 0 ? 0 : bodyText.split(" ").length;

  if (wordCount < 200) {
    findings.push(
      finding({
        category: "CONTENT",
        title: "Very little text content on the page",
        description: `The page body contains approximately ${wordCount} words.`,
        severity: wordCount < 50 ? "HIGH" : "MEDIUM",
        evidence: `Observed word count: ~${wordCount}.`,
        sourceUrl: url,
        recommendation: "Expand the page with substantive content about services, service area, and what to expect — thin pages rank poorly.",
      }),
    );
  }

  return findings;
}

export function checkConversion(html: string, url: string): AuditFindingInput[] {
  const $ = cheerio.load(html);
  const findings: AuditFindingInput[] = [];

  const telLinks = $('a[href^="tel:"]');
  if (telLinks.length === 0) {
    findings.push(
      finding({
        category: "CONVERSION",
        title: "No click-to-call phone link",
        description: "No <a href=\"tel:...\"> link was found on the page.",
        severity: "HIGH",
        evidence: "No tel: links found in the page HTML.",
        sourceUrl: url,
        recommendation: "Add a click-to-call phone link, visible in the header, so mobile visitors can call in one tap.",
      }),
    );
  }

  const forms = $("form");
  if (forms.length === 0) {
    findings.push(
      finding({
        category: "CONVERSION",
        title: "No contact/lead form found",
        description: "No <form> element was found on the page.",
        severity: "MEDIUM",
        evidence: "No <form> elements found in the page HTML.",
        sourceUrl: url,
        recommendation: "Add a short contact or quote-request form so visitors who won't call can still convert.",
      }),
    );
  }

  return findings;
}

export function runAllChecks(html: string, url: string): AuditFindingInput[] {
  return [
    ...checkTechnicalSeo(html, url),
    ...checkOnPageSeo(html, url),
    ...checkLocalSeo(html, url),
    ...checkContent(html, url),
    ...checkConversion(html, url),
  ];
}
