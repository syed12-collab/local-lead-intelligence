import { NextRequest, NextResponse } from "next/server";
import { getLeadDetail } from "@/lib/leads/get-leads";
import { buildAuditPdf } from "@/lib/export/audit-pdf";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const lead = await getLeadDetail(params.id);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const pdfBytes = await buildAuditPdf(lead);
  const safeSlug = lead.business.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const filename = `${safeSlug || "audit"}-audit.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
