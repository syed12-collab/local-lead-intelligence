import { NextRequest, NextResponse } from "next/server";
import { leadSearchInputSchema } from "@/lib/validation/schemas";
import { searchLeads } from "@/lib/leads/get-leads";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = leadSearchInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await searchLeads(parsed.data);
  return NextResponse.json(result);
}
