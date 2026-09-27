import { describe, it, expect } from "vitest";
import { checkTechnicalSeo, checkOnPageSeo, checkLocalSeo, checkContent, checkConversion } from "@/lib/providers/website-audit/checks";

const GOOD_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Family Dentist in Hattiesburg, MS | Example Dental</title>
  <meta name="description" content="Example Dental offers gentle family dentistry in Hattiesburg, MS, including cleanings, whitening, and emergency care for the whole family.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="canonical" href="https://example-dental.test/">
  <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"Dentist","name":"Example Dental","telephone":"(601) 555-0100"}
  </script>
</head>
<body>
  <h1>Family Dentistry in Hattiesburg, MS</h1>
  <p>${"We provide comprehensive dental care for the whole family. ".repeat(40)}</p>
  <a href="tel:+16015550100">Call us: (601) 555-0100</a>
  <form><input type="email" /><button>Request appointment</button></form>
  <img src="/hero.jpg" alt="Dental office waiting room">
</body>
</html>
`;

const BAD_HTML = `
<!DOCTYPE html>
<html>
<head></head>
<body>
  <img src="/photo1.jpg">
  <img src="/photo2.jpg">
  <p>Welcome.</p>
</body>
</html>
`;

describe("checkTechnicalSeo", () => {
  it("finds nothing wrong on a well-built page served over HTTPS", () => {
    const findings = checkTechnicalSeo(GOOD_HTML, "https://example-dental.test/");
    expect(findings).toHaveLength(0);
  });

  it("flags HTTP (non-HTTPS), missing meta description, missing viewport, missing canonical, and missing alt text", () => {
    const findings = checkTechnicalSeo(BAD_HTML, "http://example-bad.test/");
    const titles = findings.map((f) => f.title);
    expect(titles).toContain("Site not served over HTTPS");
    expect(titles).toContain("Missing meta description");
    expect(titles).toContain("Missing responsive viewport tag");
    expect(titles).toContain("Missing canonical link tag");
    expect(titles).toContain("Images missing alt text");
    // Every finding must carry real evidence, never a placeholder.
    for (const f of findings) {
      expect(f.evidence.length).toBeGreaterThan(0);
      expect(f.verified).toBe(true);
    }
  });
});

describe("checkOnPageSeo", () => {
  it("passes a page with a good title and single H1", () => {
    const findings = checkOnPageSeo(GOOD_HTML, "https://example-dental.test/");
    expect(findings).toHaveLength(0);
  });

  it("flags a missing title and missing H1", () => {
    const findings = checkOnPageSeo(BAD_HTML, "https://example-bad.test/");
    const titles = findings.map((f) => f.title);
    expect(titles).toContain("Missing title tag");
    expect(titles).toContain("Missing H1 heading");
  });
});

describe("checkLocalSeo", () => {
  it("passes a page with LocalBusiness schema and a phone number in text", () => {
    const findings = checkLocalSeo(GOOD_HTML, "https://example-dental.test/");
    expect(findings).toHaveLength(0);
  });

  it("flags missing schema and missing phone number", () => {
    const findings = checkLocalSeo(BAD_HTML, "https://example-bad.test/");
    const titles = findings.map((f) => f.title);
    expect(titles).toContain("No LocalBusiness structured data found");
    expect(titles).toContain("No phone number found in page text");
  });

  it("never crashes on malformed JSON-LD, and treats it as absent rather than guessing", () => {
    const malformed = `<html><head><script type="application/ld+json">{not valid json</script></head><body>text</body></html>`;
    expect(() => checkLocalSeo(malformed, "https://example.test/")).not.toThrow();
    const findings = checkLocalSeo(malformed, "https://example.test/");
    expect(findings.some((f) => f.title === "No LocalBusiness structured data found")).toBe(true);
  });
});

describe("checkContent", () => {
  it("does not flag a page with substantial text", () => {
    const findings = checkContent(GOOD_HTML, "https://example-dental.test/");
    expect(findings).toHaveLength(0);
  });

  it("flags thin content and reports an approximate word count as evidence", () => {
    const findings = checkContent(BAD_HTML, "https://example-bad.test/");
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence).toMatch(/word count/i);
  });
});

describe("checkConversion", () => {
  it("passes a page with a tel: link and a form", () => {
    const findings = checkConversion(GOOD_HTML, "https://example-dental.test/");
    expect(findings).toHaveLength(0);
  });

  it("flags missing click-to-call and missing form", () => {
    const findings = checkConversion(BAD_HTML, "https://example-bad.test/");
    const titles = findings.map((f) => f.title);
    expect(titles).toContain("No click-to-call phone link");
    expect(titles).toContain("No contact/lead form found");
  });
});
