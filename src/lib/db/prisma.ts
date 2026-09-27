// Prisma client singleton — avoids exhausting DB connections from
// hot-reloaded module instances in dev.
//
// Constructed LAZILY via a Proxy rather than at module-import time. This
// matters beyond tidiness: several server components (e.g. the search
// page) import lib/auth/config.ts just to call getServerSession(), which
// in turn imports this module to build the Prisma adapter. If this file
// constructed PrismaClient eagerly, every one of those pages would crash
// the moment `prisma generate` hasn't been run — which is exactly the
// state of this sandbox (see progress.md) and would also be true for
// any fresh `npm install` before its first `prisma generate`. Deferring
// construction until a property is actually accessed means importing
// this module (or anything that imports it) is always safe; only an
// actual query fails, and only when the client genuinely isn't ready.
import type { PrismaClient as PrismaClientType } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientType };

function createPrismaClient(): PrismaClientType {
  // Required lazily too, for the same reason as above.
  const { PrismaClient } = require("@prisma/client");
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma: PrismaClientType = new Proxy({} as PrismaClientType, {
  get(_target, prop, receiver) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    return Reflect.get(globalForPrisma.prisma as object, prop, receiver);
  },
});
