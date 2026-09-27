// Seeds Postgres with the same demo dataset the mock provider serves,
// so the DB-backed path (once wired up) has something to show too.
// Requires DATABASE_URL to point at a real, migrated Postgres instance —
// this script is NOT run as part of Phase 1's mock-mode UI.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { MOCK_BUSINESSES, MOCK_FINDINGS_BY_DOMAIN } from "../src/lib/data/mock-leads";
import { calculateScores } from "../src/lib/scoring/calculate";

const prisma = new PrismaClient();

// Documented, seed-only demo credentials — never use this password for
// anything real. Purely so `npm run db:seed` leaves you with a working
// login to test the app's authenticated paths against.
const DEMO_PASSWORD = "DemoPass123!";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@local-lead-intelligence.test" },
    update: { passwordHash },
    create: {
      email: "demo@local-lead-intelligence.test",
      name: "Demo User",
      passwordHash,
    },
  });

  for (const b of MOCK_BUSINESSES) {
    const business = await prisma.business.upsert({
      where: { source_sourceBusinessId: { source: b.source, sourceBusinessId: b.sourceBusinessId } },
      update: {},
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

    let domain: string | null = null;
    if (b.websiteUrl) {
      try {
        domain = new URL(b.websiteUrl).hostname;
      } catch {
        domain = null;
      }
    }
    const findings = domain ? MOCK_FINDINGS_BY_DOMAIN[domain] ?? [] : [];

    const auditRun = await prisma.auditRun.create({
      data: {
        businessId: business.id,
        status: "COMPLETE",
        finishedAt: new Date(),
        findings: { create: findings },
      },
    });

    const scores = calculateScores(b, findings);
    await prisma.score.create({
      data: {
        businessId: business.id,
        auditRunId: auditRun.id,
        profileScore: scores.profileScore,
        websiteSeoScore: scores.websiteSeoScore,
        technicalSeoScore: scores.technicalSeoScore,
        localSeoScore: scores.localSeoScore,
        contentScore: scores.contentScore,
        conversionScore: scores.conversionScore,
        opportunityScore: scores.opportunityScore,
        explanation: scores.explanation as unknown as object,
      },
    });
  }

  console.log(`Seeded ${MOCK_BUSINESSES.length} businesses for user ${demoUser.email}`);
  console.log(`Demo login: ${demoUser.email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
