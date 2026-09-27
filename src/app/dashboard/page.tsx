import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { LeadSearchBox } from "@/components/dashboard/lead-search-box";
import { listAllDemoLeads } from "@/lib/leads/get-leads";

export default async function DashboardPage() {
  const leads = await listAllDemoLeads();

  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === "NEW").length;
  const auditedLeads = leads.filter((l) => l.status === "AUDITED").length;
  const highOpportunity = leads.filter((l) => l.scores.opportunityScore >= 70).length;
  const proposalsGenerated = auditedLeads; // Phase 1: a proposal draft exists wherever an audit has findings

  const stats = [
    { label: "Total Leads", value: totalLeads },
    { label: "New Leads", value: newLeads },
    { label: "Audited Leads", value: auditedLeads },
    { label: "High Opportunity", value: highOpportunity },
    { label: "Proposals Generated", value: proposalsGenerated },
  ];

  return (
    <DashboardShell>
      <Topbar title="Dashboard" subtitle="Overview of your lead pipeline" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="py-5">
                <p className="text-2xl font-semibold text-ink-900">{s.value}</p>
                <p className="mt-1 text-xs text-ink-600">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6">
          <LeadSearchBox />
        </div>

        {totalLeads === 0 && (
          <Card className="mt-6">
            <CardContent className="py-10 text-center">
              <p className="text-sm font-medium text-ink-900">No leads yet</p>
              <p className="mt-1 text-sm text-ink-600">
                Run a search above to discover local businesses and start building your pipeline.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </DashboardShell>
  );
}
