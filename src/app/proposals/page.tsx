import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listAllDemoLeads, getLeadDetail } from "@/lib/leads/get-leads";

export default async function ProposalsPage() {
  const leads = await listAllDemoLeads();
  const audited = leads.filter((l) => l.status === "AUDITED");
  const details = await Promise.all(
    audited.map((l) => getLeadDetail(l.business.sourceBusinessId)),
  );

  return (
    <DashboardShell>
      <Topbar title="Proposals" subtitle="Draft outreach generated from verified audit findings" />
      <main className="flex-1 overflow-y-auto p-6">
        <Card>
          <CardContent className="py-4">
            {details.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-ink-900">No proposals yet</p>
                <p className="mt-1 text-sm text-ink-600">
                  Proposals draft automatically once a lead has audit findings to work from.
                </p>
              </div>
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Business</Th>
                    <Th>Subject</Th>
                    <Th>Observations</Th>
                    <Th>Status</Th>
                    <Th></Th>
                  </tr>
                </Thead>
                <Tbody>
                  {details.map((d) =>
                    d ? (
                      <tr key={d.business.sourceBusinessId}>
                        <Td className="font-medium">{d.business.name}</Td>
                        <Td>{d.proposal.subject}</Td>
                        <Td>{d.proposal.observations.length}</Td>
                        <Td>
                          <Badge tone="neutral">Draft</Badge>
                        </Td>
                        <Td>
                          <Link
                            href={`/leads/${d.business.sourceBusinessId}`}
                            className="text-sm text-signal hover:underline"
                          >
                            View
                          </Link>
                        </Td>
                      </tr>
                    ) : null,
                  )}
                </Tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </DashboardShell>
  );
}
