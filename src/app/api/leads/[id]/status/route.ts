import { NextRequest, NextResponse } from "next/server";
import { leadStatusUpdateSchema } from "@/lib/validation/schemas";
import { getBusinessDataProvider } from "@/lib/providers/factory";
import { setLeadStatus } from "@/lib/db/repository";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = leadStatusUpdateSchema.pick({ status: true }).safeParse(body);
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
    await setLeadStatus(business, parsed.data.status);
    return NextResponse.json({ status: parsed.data.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update status";
    const status = message.includes("DATABASE_URL") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
