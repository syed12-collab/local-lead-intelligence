// robots.txt permission check.
//
// Deliberately conservative: any network/parse failure defaults to NOT
// allowed. It's safer to under-crawl than to crawl a site that asked not
// to be crawled because our own fetch failed.

export interface RobotsCheckResult {
  allowed: boolean;
  note: string;
}

const FETCH_TIMEOUT_MS = 8000;
const OUR_USER_AGENT = "LocalLeadIntelligenceBot/0.1 (+https://example.invalid/bot)";

// Minimal robots.txt parser: honors Disallow rules under `User-agent: *`
// and under our own UA if a specific block exists. Does not implement
// Allow-rule precedence, wildcards, or crawl-delay — sufficient for a
// coarse "is the root/this path blocked" decision, not a full spec
// implementation.
function isPathDisallowed(robotsTxt: string, path: string, userAgent: string): boolean {
  const lines = robotsTxt.split(/\r?\n/).map((l) => l.trim());
  let inRelevantBlock = false;
  let matchedSpecificUA = false;
  const disallowRules: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;

    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    const directive = key.trim().toLowerCase();

    if (directive === "user-agent") {
      const ua = value.toLowerCase();
      if (ua === "*") {
        // Only apply the wildcard block if we haven't found a more
        // specific block for our UA elsewhere in the file.
        inRelevantBlock = !matchedSpecificUA;
      } else if (userAgent.toLowerCase().includes(ua)) {
        inRelevantBlock = true;
        matchedSpecificUA = true;
        disallowRules.length = 0; // specific block overrides wildcard rules collected so far
      } else {
        inRelevantBlock = false;
      }
      continue;
    }

    if (inRelevantBlock && directive === "disallow" && value) {
      disallowRules.push(value);
    }
  }

  return disallowRules.some((rule) => path.startsWith(rule));
}

export async function checkRobotsPermission(
  websiteUrl: string,
  path: string = "/",
): Promise<RobotsCheckResult> {
  let origin: string;
  try {
    origin = new URL(websiteUrl).origin;
  } catch {
    return { allowed: false, note: "Invalid website URL" };
  }

  const robotsUrl = `${origin}/robots.txt`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: { "User-Agent": OUR_USER_AGENT },
    });

    if (res.status === 404) {
      // No robots.txt at all is conventionally treated as "crawling permitted."
      return { allowed: true, note: "No robots.txt found — crawl permitted by default" };
    }

    if (!res.ok) {
      return { allowed: false, note: `robots.txt fetch returned ${res.status} — treating as not permitted` };
    }

    const text = await res.text();
    const disallowed = isPathDisallowed(text, path, OUR_USER_AGENT);

    return {
      allowed: !disallowed,
      note: disallowed
        ? `Disallowed by robots.txt for path "${path}"`
        : "Permitted by robots.txt",
    };
  } catch (err) {
    return {
      allowed: false,
      note: `robots.txt fetch failed (${err instanceof Error ? err.message : "unknown error"}) — treating as not permitted`,
    };
  } finally {
    clearTimeout(timeout);
  }
}
