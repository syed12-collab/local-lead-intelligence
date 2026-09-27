import { describe, it, expect } from "vitest";
import { leadSearchInputSchema } from "@/lib/validation/schemas";

describe("leadSearchInputSchema", () => {
  it("accepts a valid search", () => {
    const result = leadSearchInputSchema.safeParse({
      keyword: "Dentist",
      location: "Hattiesburg, MS",
      radiusMi: 25,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a keyword that's too short", () => {
    const result = leadSearchInputSchema.safeParse({
      keyword: "d",
      location: "Hattiesburg, MS",
      radiusMi: 25,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a radius outside 1-100", () => {
    const result = leadSearchInputSchema.safeParse({
      keyword: "Dentist",
      location: "Hattiesburg, MS",
      radiusMi: 500,
    });
    expect(result.success).toBe(false);
  });

  it("defaults radiusMi to 25 when omitted", () => {
    const result = leadSearchInputSchema.safeParse({
      keyword: "Dentist",
      location: "Hattiesburg, MS",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.radiusMi).toBe(25);
  });
});
