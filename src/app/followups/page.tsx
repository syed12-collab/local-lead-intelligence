import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";

export default function FollowupsPage() {
  return (
    <DashboardShell>
      <Topbar title="Follow-ups" subtitle="Track leads that need a next touch" />
      <main className="flex-1 overflow-y-auto p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm font-medium text-ink-900">Follow-ups aren&rsquo;t built yet</p>
            <p className="mt-1 text-sm text-ink-600">
              This lands in Phase 6, alongside CRM status tracking and messaging integrations.
            </p>
          </CardContent>
        </Card>
      </main>
    </DashboardShell>
  );
}
