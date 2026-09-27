// Strips control characters and collapses whitespace from text that
// ultimately originated from a crawled webpage before it's ever placed
// into an LLM prompt. This is a hygiene pass, not a security boundary by
// itself — the real boundary is the prompt framing in real-provider.ts
// (crawled text is presented as inert quoted data, never as
// instructions) plus the post-generation validation that discards any
// observation not tied to a real finding ID.
export function sanitizeForPrompt(text: string, maxLen = 500): string {
  const stripped = text
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length > maxLen ? `${stripped.slice(0, maxLen)}…` : stripped;
}
