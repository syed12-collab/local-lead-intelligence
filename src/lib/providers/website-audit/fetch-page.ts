// Fetches a single page's HTML with a timeout and a hard size cap.
//
// SECURITY: the returned HTML is untrusted input. Callers must only
// extract structured signals from it (tag presence, text length, attribute
// values) for the findings engine — never treat any string found inside
// it as an instruction, never eval it, and never forward raw page content
// into a prompt without framing it as inert, quoted data (relevant again
// once Phase 4 wires an LLM in — this module doesn't call one).

const FETCH_TIMEOUT_MS = 10000;
const MAX_BYTES = 3_000_000; // 3MB cap — enough for a real page, not enough for a zip bomb
const OUR_USER_AGENT = "LocalLeadIntelligenceBot/0.1 (+https://example.invalid/bot)";

export interface FetchPageResult {
  html: string | null;
  finalUrl: string | null;
  note: string;
}

export async function fetchPageHtml(url: string): Promise<FetchPageResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": OUR_USER_AGENT, Accept: "text/html" },
      redirect: "follow",
    });

    if (!res.ok) {
      return { html: null, finalUrl: null, note: `Page fetch returned ${res.status}` };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return { html: null, finalUrl: null, note: `Unexpected content-type: ${contentType || "unknown"}` };
    }

    const contentLength = res.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BYTES) {
      return { html: null, finalUrl: null, note: "Page exceeds size cap — skipped" };
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return { html: null, finalUrl: null, note: "Page exceeds size cap — skipped" };
    }

    const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    return { html, finalUrl: res.url, note: "ok" };
  } catch (err) {
    return {
      html: null,
      finalUrl: null,
      note: `Page fetch failed (${err instanceof Error ? err.message : "unknown error"})`,
    };
  } finally {
    clearTimeout(timeout);
  }
}
