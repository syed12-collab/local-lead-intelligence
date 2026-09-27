import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  return (
    <DashboardShell>
      <Topbar title="Settings" subtitle="Account and data provider configuration" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Business data provider</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-900">Mock provider</span>
                <Badge tone="signal">Active</Badge>
              </div>
              <p className="mt-2 text-xs text-ink-600">
                No external credentials required. Swap in a real provider (e.g. Google Places, Yelp
                Fusion) by implementing BusinessDataProvider and setting BUSINESS_DATA_PROVIDER in
                your environment — the rest of the app doesn&rsquo;t change.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>AI proposal provider</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-900">Mock provider (deterministic)</span>
                <Badge tone="signal">Active</Badge>
              </div>
              <p className="mt-2 text-xs text-ink-600">
                Phase 4 swaps this for a real LLM-backed provider behind the same AiProposalProvider
                interface, constrained to only cite verified findings.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </DashboardShell>
  );
}
