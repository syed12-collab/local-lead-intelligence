import { describe, it, expect } from "vitest";
import { sanitizeForPrompt } from "@/lib/providers/ai/sanitize";

describe("sanitizeForPrompt", () => {
  it("strips control characters", () => {
    const result = sanitizeForPrompt("hello\x00\x01world");
    expect(result).toBe("helloworld");
  });

  it("collapses whitespace/newlines", () => {
    const result = sanitizeForPrompt("hello\n\n\n   world\t\ttab");
    expect(result).toBe("hello world tab");
  });

  it("truncates long text with an ellipsis", () => {
    const result = sanitizeForPrompt("a".repeat(1000), 10);
    expect(result.length).toBe(11); // 10 chars + ellipsis
    expect(result.endsWith("…")).toBe(true);
  });

  it("leaves ordinary short text untouched", () => {
    expect(sanitizeForPrompt("Missing meta description")).toBe("Missing meta description");
  });
});
