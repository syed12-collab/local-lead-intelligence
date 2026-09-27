// Best-effort persistence of search results into Postgres.
//
// Persists Business + BusinessLocation records (deduplicated on the
// schema's @@unique([source, sourceBusinessId])) unconditionally, and
// additionally records a Search + SearchResult row when a userId is
// supplied (i.e. the search was run by a signed-in user — see
// lib/leads/get-leads.ts, which threads the session through from
// src/app/search/page.tsx). An anonymous search still upserts businesses
// but has no user to attribute a Search row to, so it skips that part.
//
// TEST STATUS: this has not run against a live Postgres instance in this
// sandbox (see progress.md — no DB was available, and `prisma generate`
// itself couldn't complete). The upsert logic mirrors prisma/seed.ts,
// which was written against the same schema, but neither has been
// executed against a real database. Every call here is wrapped so a
// failure — including "Prisma isn't even generated" — never breaks the
// page that triggered it; it only logs.

import type { NormalizedBusiness } from "@/types/domain";
import type { LeadSearchInput } from "@/lib/validation/schemas";

export async function persistSearchResults(
  input: LeadSearchInput,
  businesses: NormalizedBusiness[],
  userId?: string | null,
): Promise<void> {
  if (!process.env.DATABASE_URL) {
    // No DB configured — Phase 1/2 mock-mode UI runs fine without this;
    // silently skip rather than attempt a connection that can't succeed.
    return;
  }

  try {
    const { prisma } = await import("@/lib/db/prisma");

    const upsertedIds: string[] = [];

    for (const b of businesses) {
      const business = await prisma.business.upsert({
        where: { source_sourceBusinessId: { source: b.source, sourceBusinessId: b.sourceBusinessId } },
        update: {
          name: b.name,
          category: b.category,
          phone: b.phone,
          websiteUrl: b.websiteUrl,
          rating: b.rating,
          reviewCount: b.reviewCount,
          sourceConfidence: b.sourceConfidence,
          lastCheckedAt: new Date(),
        },
        create: {
          name: b.name,
          category: b.category,
          source: b.source,
          sourceBusinessId: b.sourceBusinessId,
          sourceConfidence: b.sourceConfidence,
          phone: b.phone,
          websiteUrl: b.websiteUrl,
          rating: b.rating,
          reviewCount: b.reviewCount,
          lastCheckedAt: new Date(),
          location: {
            create: {
              address: b.address,
              city: b.city,
              state: b.state,
              postalCode: b.postalCode,
              latitude: b.latitude,
              longitude: b.longitude,
              confidence: b.locationConfidence,
            },
          },
        },
      });
      upsertedIds.push(business.id);
    }

    // Record the search itself, attributed to the signed-in user, so
    // their search history is queryable later (leads pipeline,
    // "searches I've run" views, etc.). Anonymous searches (no session)
    // still upsert businesses above but don't get a Search row — there's
    // no user to attribute it to.
    if (userId) {
      const search = await prisma.search.create({
        data: {
          userId,
          keyword: input.keyword,
          location: input.location,
          radiusMi: input.radiusMi,
          resultCount: businesses.length,
          results: {
            create: upsertedIds.map((businessId, i) => ({ businessId, rank: i })),
          },
        },
      });
      void search;
    }
  } catch (err) {
    // Never let a persistence problem break the search the user is
    // looking at — log and move on. A real deployment should route this
    // to structured logging/monitoring instead of console.
    console.error(
      `[persistSearchResults] failed for "${input.keyword}" in "${input.location}":`,
      err instanceof Error ? err.message : err,
    );
  }
}

// ── CRM: status overrides and notes ─────────────────────────────────
//
// Unlike persistSearchResults (best-effort, silent on failure — a search
// result is never wrong to show even if saving it failed), the functions
// below are called in direct response to an explicit user action (typed
// a note, changed a status) and THROW on failure instead of swallowing
// it. The caller (an API route) is expected to catch and report a real
// error to the user rather than silently discarding what they typed.
//
// TEST STATUS: same caveat as the rest of this file — unverified against
// a live Postgres instance in this sandbox.

class CrmNotConfiguredError extends Error {
  constructor() {
    super("CRM features require DATABASE_URL to be configured");
    this.name = "CrmNotConfiguredError";
  }
}

async function ensureBusinessRow(business: NormalizedBusiness) {
  const { prisma } = await import("@/lib/db/prisma");
  return prisma.business.upsert({
    where: { source_sourceBusinessId: { source: business.source, sourceBusinessId: business.sourceBusinessId } },
    update: {},
    create: {
      name: business.name,
      category: business.category,
      source: business.source,
      sourceBusinessId: business.sourceBusinessId,
      sourceConfidence: business.sourceConfidence,
      phone: business.phone,
      websiteUrl: business.websiteUrl,
      rating: business.rating,
      reviewCount: business.reviewCount,
      lastCheckedAt: new Date(),
    },
  });
}

export interface CrmNote {
  id: string;
  body: string;
  createdAt: string;
  authorName: string | null;
  authorEmail: string;
}

export async function listNotesForBusiness(
  source: NormalizedBusiness["source"],
  sourceBusinessId: string,
): Promise<CrmNote[]> {
  if (!process.env.DATABASE_URL) return [];

  try {
    const { prisma } = await import("@/lib/db/prisma");
    const business = await prisma.business.findUnique({
      where: { source_sourceBusinessId: { source, sourceBusinessId } },
    });
    if (!business) return [];

    const notes = await prisma.note.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });

    return notes.map((n: { id: string; body: string; createdAt: Date; user: { name: string | null; email: string } }) => ({
      id: n.id,
      body: n.body,
      createdAt: n.createdAt.toISOString(),
      authorName: n.user.name,
      authorEmail: n.user.email,
    }));
  } catch (err) {
    console.error("[listNotesForBusiness] failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function addNoteForBusiness(
  business: NormalizedBusiness,
  userId: string,
  body: string,
): Promise<CrmNote> {
  if (!process.env.DATABASE_URL) throw new CrmNotConfiguredError();

  const { prisma } = await import("@/lib/db/prisma");
  const businessRow = await ensureBusinessRow(business);
  const note = await prisma.note.create({
    data: { businessId: businessRow.id, userId, body },
    include: { user: true },
  });

  return {
    id: note.id,
    body: note.body,
    createdAt: note.createdAt.toISOString(),
    authorName: note.user.name,
    authorEmail: note.user.email,
  };
}

export async function getLeadStatusOverride(
  source: NormalizedBusiness["source"],
  sourceBusinessId: string,
): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null;

  try {
    const { prisma } = await import("@/lib/db/prisma");
    const business = await prisma.business.findUnique({
      where: { source_sourceBusinessId: { source, sourceBusinessId } },
      select: { status: true },
    });
    return business?.status ?? null;
  } catch (err) {
    console.error("[getLeadStatusOverride] failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function setLeadStatus(business: NormalizedBusiness, status: string): Promise<void> {
  if (!process.env.DATABASE_URL) throw new CrmNotConfiguredError();

  const { prisma } = await import("@/lib/db/prisma");
  const businessRow = await ensureBusinessRow(business);
  await prisma.business.update({
    where: { id: businessRow.id },
    data: { status: status as never }, // validated against the LeadStatus enum by the caller's Zod schema before reaching here
  });
}
