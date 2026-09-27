import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScorePill, OpportunityPill } from "@/components/dashboard/score-pill";
import { FindingItem } from "@/components/dashboard/finding-item";
import { ProposalCard } from "@/components/dashboard/proposal-card";
import { StatusSelect } from "@/components/dashboard/status-select";
import { NotesPanel } from "@/components/dashboard/notes-panel";
import { Button } from "@/components/ui/button";
import { getLeadDetail } from "@/lib/leads/get-leads";
import { listNotesForBusiness } from "@/lib/db/repository";

function nv(value: string | number | null): string {
  return value === null || value === "" ? "NOT VERIFIED" : String(value);
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await getLeadDetail(params.id);
  if (!lead) notFound();

  const initialNotes = await listNotesForBusiness(lead.business.source, lead.business.sourceBusinessId);

  const { business, scores, findings, proposal, crawlStatusNote } = lead;

  const byCategory = (category: string) => findings.filter((f) => f.category === category);

  return (
    <DashboardShell>
      <Topbar
        title={business.name}
        subtitle={business.category ?? "NOT VERIFIED"}
        actions={
          <a href={`/api/leads/${params.id}/export`}>
            <Button variant="secondary" size="sm">
              Export PDF
            </Button>
          </a>
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-ink-600">Address</dt>
                    <dd className="text-ink-900">{nv(business.address)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-600">City / State</dt>
                    <dd className="text-ink-900">
                      {nv(business.city)}, {nv(business.state)} {business.postalCode ?? ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-600">Phone</dt>
                    <dd className="text-ink-900">{nv(business.phone)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-600">Website</dt>
                    <dd className="text-ink-900">{nv(business.websiteUrl)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-600">Data source</dt>
                    <dd className="text-ink-900">{business.source}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-600">Source confidence</dt>
                    <dd className="text-ink-900">{business.sourceConfidence}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business / Profile Signals</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-ink-600">Rating</dt>
                    <dd className="text-ink-900">{nv(business.rating)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-600">Review count</dt>
                    <dd className="text-ink-900">{nv(business.reviewCount)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Website Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-ink-800">{crawlStatusNote}</p>
              </CardContent>
            </Card>

            {(["TECHNICAL_SEO", "LOCAL_SEO", "CONTENT", "CONVERSION"] as const).map((category) => {
              const items = byCategory(category);
              const titles: Record<string, string> = {
                TECHNICAL_SEO: "Technical Issues",
                LOCAL_SEO: "Local SEO Audit",
                CONTENT: "Content Opportunities",
                CONVERSION: "Conversion Issues",
              };
              return (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle>{titles[category]}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {items.length === 0 ? (
                      <p className="text-sm text-ink-600">No findings in this category.</p>
                    ) : (
                      items.map((f) => <FindingItem key={f.id} finding={f} />)
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <Card>
              <CardHeader>
                <CardTitle>AI Proposal</CardTitle>
              </CardHeader>
              <CardContent>
                <ProposalCard proposal={proposal} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusSelect leadId={params.id} currentStatus={lead.status} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Opportunity Score</CardTitle>
              </CardHeader>
              <CardContent>
                <OpportunityPill value={scores.opportunityScore} />
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <ScorePill label="Profile" value={scores.profileScore} />
                  <ScorePill label="Website SEO" value={scores.websiteSeoScore} />
                  <ScorePill label="Technical SEO" value={scores.technicalSeoScore} />
                  <ScorePill label="Local SEO" value={scores.localSeoScore} />
                  <ScorePill label="Content" value={scores.contentScore} />
                  <ScorePill label="Conversion" value={scores.conversionScore} />
                </div>
                <div className="mt-4 space-y-2 border-t border-ink-600/10 pt-4">
                  <p className="text-xs font-medium text-ink-900">Why this score</p>
                  {scores.explanation.map((e, i) => (
                    <p key={i} className="text-xs text-ink-600">
                      {e.contribution}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-ink-900">{nv(business.phone)}</p>
                <p className="mt-1 text-xs text-ink-600">
                  Email and additional contact channels: NOT VERIFIED — contact discovery for this
                  business has not surfaced anything beyond the listed phone number.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommended Services</CardTitle>
              </CardHeader>
              <CardContent>
                {findings.length === 0 ? (
                  <p className="text-sm text-ink-600">Run an audit to generate recommendations.</p>
                ) : (
                  <ul className="space-y-2 text-sm text-ink-800">
                    {findings.slice(0, 3).map((f) => (
                      <li key={f.id}>{f.recommendation}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <NotesPanel leadId={params.id} initialNotes={initialNotes} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </DashboardShell>
  );
}
