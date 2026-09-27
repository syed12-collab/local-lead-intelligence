import { describe, it, expect } from "vitest";
import { registerInputSchema } from "@/lib/validation/schemas";

describe("registerInputSchema", () => {
  it("accepts a valid registration", () => {
    const result = registerInputSchema.safeParse({
      name: "Syed Noor",
      email: "syed@example.test",
      password: "correcthorsebattery",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = registerInputSchema.safeParse({
      name: "Syed",
      email: "not-an-email",
      password: "correcthorsebattery",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = registerInputSchema.safeParse({
      name: "Syed",
      email: "syed@example.test",
      password: "short",
    });
    expect(result.success).toBe(false);
  });
});
