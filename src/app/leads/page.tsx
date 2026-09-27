import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { LeadsTable } from "@/components/dashboard/leads-table";
import { Pagination } from "@/components/dashboard/pagination";
import { Button } from "@/components/ui/button";
import { listAllDemoLeads } from "@/lib/leads/get-leads";

const PAGE_SIZE = 5;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const allLeads = await listAllDemoLeads();
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const start = (page - 1) * PAGE_SIZE;
  const pageLeads = allLeads.slice(start, start + PAGE_SIZE);

  return (
    <DashboardShell>
      <Topbar
        title="Leads"
        subtitle={`${allLeads.length} lead${allLeads.length === 1 ? "" : "s"} in your pipeline`}
        actions={
          <a href="/api/leads/export">
            <Button variant="secondary" size="sm">
              Export CSV
            </Button>
          </a>
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        <Card>
          <CardContent className="py-4">
            <LeadsTable leads={pageLeads} />
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={allLeads.length}
              buildHref={(p) => `/leads?page=${p}`}
            />
          </CardContent>
        </Card>
      </main>
    </DashboardShell>
  );
}
