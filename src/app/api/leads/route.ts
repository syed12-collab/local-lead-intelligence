import { NextResponse } from "next/server";
import { listAllDemoLeads } from "@/lib/leads/get-leads";

export async function GET() {
  const leads = await listAllDemoLeads();
  return NextResponse.json({ count: leads.length, leads });
}
