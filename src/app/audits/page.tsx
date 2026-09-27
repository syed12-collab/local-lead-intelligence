import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/table";
import { OpportunityPill } from "@/components/dashboard/score-pill";
import { listAllDemoLeads } from "@/lib/leads/get-leads";

export default async function AuditsPage() {
  const leads = await listAllDemoLeads();
  const audited = leads.filter((l) => l.status === "AUDITED");

  return (
    <DashboardShell>
      <Topbar title="Audits" subtitle={`${audited.length} completed audit${audited.length === 1 ? "" : "s"}`} />
      <main className="flex-1 overflow-y-auto p-6">
        <Card>
          <CardContent className="py-4">
            {audited.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-ink-900">No audits yet</p>
                <p className="mt-1 text-sm text-ink-600">
                  Audits run automatically for leads with a website once they&rsquo;re discovered via search.
                </p>
              </div>
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Business</Th>
                    <Th>Findings</Th>
                    <Th>Opportunity</Th>
                    <Th></Th>
                  </tr>
                </Thead>
                <Tbody>
                  {audited.map((lead) => (
                    <tr key={lead.business.sourceBusinessId}>
                      <Td className="font-medium">{lead.business.name}</Td>
                      <Td>{lead.findingCount}</Td>
                      <Td>
                        <OpportunityPill value={lead.scores.opportunityScore} />
                      </Td>
                      <Td>
                        <Link
                          href={`/leads/${lead.business.sourceBusinessId}`}
                          className="text-sm text-signal hover:underline"
                        >
                          View audit
                        </Link>
                      </Td>
                    </tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </DashboardShell>
  );
}
