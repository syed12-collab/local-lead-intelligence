import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { noteInputSchema } from "@/lib/validation/schemas";
import { getBusinessDataProvider } from "@/lib/providers/factory";
import { listNotesForBusiness, addNoteForBusiness } from "@/lib/db/repository";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const provider = getBusinessDataProvider();
  const business = await provider.getBusinessDetails(params.id);
  if (!business) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  const notes = await listNotesForBusiness(business.source, business.sourceBusinessId);
  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in to add a note" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = noteInputSchema.pick({ body: true }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const provider = getBusinessDataProvider();
  const business = await provider.getBusinessDetails(params.id);
  if (!business) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  try {
    const note = await addNoteForBusiness(business, userId, parsed.data.body);
    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save note";
    const status = message.includes("DATABASE_URL") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
