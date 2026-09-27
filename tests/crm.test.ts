import { describe, it, expect, afterEach } from "vitest";
import {
  listNotesForBusiness,
  addNoteForBusiness,
  getLeadStatusOverride,
  setLeadStatus,
} from "@/lib/db/repository";
import { leadStatusUpdateSchema, noteInputSchema } from "@/lib/validation/schemas";
import type { NormalizedBusiness } from "@/types/domain";

const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;

const fakeBusiness: NormalizedBusiness = {
  sourceBusinessId: "mock-001",
  source: "MOCK",
  sourceConfidence: "OBSERVED",
  name: "Pine Belt Family Dental",
  category: "Dentist",
  phone: "(601) 555-0142",
  websiteUrl: "https://pinebeltfamilydental.example",
  rating: 4.6,
  reviewCount: 88,
  address: null,
  city: "Hattiesburg",
  state: "MS",
  postalCode: null,
  latitude: null,
  longitude: null,
  hours: null,
  locationConfidence: "OBSERVED",
};

afterEach(() => {
  if (ORIGINAL_DATABASE_URL === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = ORIGINAL_DATABASE_URL;
  }
});

describe("CRM functions degrade honestly with no DATABASE_URL configured", () => {
  it("listNotesForBusiness returns an empty array rather than throwing", async () => {
    delete process.env.DATABASE_URL;
    const notes = await listNotesForBusiness("MOCK", "mock-001");
    expect(notes).toEqual([]);
  });

  it("getLeadStatusOverride returns null rather than throwing", async () => {
    delete process.env.DATABASE_URL;
    const status = await getLeadStatusOverride("MOCK", "mock-001");
    expect(status).toBeNull();
  });

  it("addNoteForBusiness throws a clear, catchable error (a write action must not fail silently)", async () => {
    delete process.env.DATABASE_URL;
    await expect(addNoteForBusiness(fakeBusiness, "user-1", "Great lead")).rejects.toThrow(/DATABASE_URL/);
  });

  it("setLeadStatus throws a clear, catchable error", async () => {
    delete process.env.DATABASE_URL;
    await expect(setLeadStatus(fakeBusiness, "QUALIFIED")).rejects.toThrow(/DATABASE_URL/);
  });
});

describe("leadStatusUpdateSchema", () => {
  it("accepts every real LeadStatus enum value", () => {
    const values = [
      "NEW", "QUEUED_FOR_AUDIT", "AUDITED", "QUALIFIED",
      "CONTACTED", "RESPONDED", "WON", "LOST", "DISQUALIFIED",
    ];
    for (const status of values) {
      const result = leadStatusUpdateSchema.pick({ status: true }).safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects a status that isn't in the enum, so the API can never write garbage into the DB", () => {
    const result = leadStatusUpdateSchema.pick({ status: true }).safeParse({ status: "MADE_UP_STATUS" });
    expect(result.success).toBe(false);
  });
});

describe("noteInputSchema", () => {
  it("rejects an empty note body", () => {
    const result = noteInputSchema.pick({ body: true }).safeParse({ body: "" });
    expect(result.success).toBe(false);
  });

  it("accepts a real note", () => {
    const result = noteInputSchema.pick({ body: true }).safeParse({ body: "Called, left voicemail." });
    expect(result.success).toBe(true);
  });
});
