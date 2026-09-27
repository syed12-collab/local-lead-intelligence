import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";

export default function LeadNotFound() {
  return (
    <DashboardShell>
      <Topbar title="Lead not found" />
      <main className="flex-1 overflow-y-auto p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm font-medium text-ink-900">This lead doesn&rsquo;t exist</p>
            <p className="mt-1 text-sm text-ink-600">
              It may not be in the current mock dataset, or the ID is incorrect.
            </p>
            <Link href="/leads" className="mt-4 inline-block text-sm text-signal hover:underline">
              Back to leads
            </Link>
          </CardContent>
        </Card>
      </main>
    </DashboardShell>
  );
}
