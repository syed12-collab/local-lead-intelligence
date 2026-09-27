import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { registerInputSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "No database configured — registration is unavailable in mock-mode Phase 1-3 setups" },
      { status: 503 },
    );
  }

  try {
    const { prisma } = await import("@/lib/db/prisma");
    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/auth/register] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
