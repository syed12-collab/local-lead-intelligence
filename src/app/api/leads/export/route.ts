import { NextRequest, NextResponse } from "next/server";
import { leadsToCsv } from "@/lib/export/leads-csv";
import { listAllDemoLeads, searchLeads } from "@/lib/leads/get-leads";
import { leadExportInputSchema } from "@/lib/validation/schemas";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword");
  const location = searchParams.get("location");

  let leads;
  if (keyword && location) {
    const parsed = leadExportInputSchema.safeParse({
      keyword,
      location,
      radiusMi: Number(searchParams.get("radiusMi") ?? 25),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    // Export intentionally uses a much larger page than the UI ever
    // does — leadSearchInputSchema caps pageSize at 50 for pagination
    // sanity, but an export should return the full result set in one
    // file. page/pageSize aren't part of leadExportInputSchema at all,
    // so this never goes through that cap.
    const result = await searchLeads({ ...parsed.data, page: 1, pageSize: 500 });
    leads = result.items;
  } else {
    leads = await listAllDemoLeads();
  }

  const csv = leadsToCsv(leads);
  const filename = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
