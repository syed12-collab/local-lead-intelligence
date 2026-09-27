import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { LeadSearchBox } from "@/components/dashboard/lead-search-box";
import { LeadsTable } from "@/components/dashboard/leads-table";
import { Pagination } from "@/components/dashboard/pagination";
import { Button } from "@/components/ui/button";
import { searchLeads } from "@/lib/leads/get-leads";
import { leadSearchInputSchema } from "@/lib/validation/schemas";

const PAGE_SIZE = 5;

interface SearchPageProps {
  searchParams: { keyword?: string; location?: string; radiusMi?: string; page?: string };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const hasQuery = Boolean(searchParams.keyword && searchParams.location);

  let result: Awaited<ReturnType<typeof searchLeads>> | null = null;
  let validationError: string | null = null;

  if (hasQuery) {
    const parsed = leadSearchInputSchema.safeParse({
      keyword: searchParams.keyword,
      location: searchParams.location,
      radiusMi: Number(searchParams.radiusMi ?? 25),
      page: Number(searchParams.page ?? 1),
      pageSize: PAGE_SIZE,
    });

    if (parsed.success) {
      const session = process.env.DATABASE_URL ? await getServerSession(authOptions).catch(() => null) : null;
      const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
      result = await searchLeads(parsed.data, userId);
    } else {
      validationError = parsed.error.issues[0]?.message ?? "Invalid search input";
    }
  }

  function buildHref(page: number) {
    const params = new URLSearchParams({
      keyword: searchParams.keyword ?? "",
      location: searchParams.location ?? "",
      radiusMi: searchParams.radiusMi ?? "25",
      page: String(page),
    });
    return `/search?${params.toString()}`;
  }

  return (
    <DashboardShell>
      <Topbar title="Search Leads" subtitle="Discover local businesses by keyword and location" />
      <main className="flex-1 overflow-y-auto p-6">
        <LeadSearchBox />

        {validationError && (
          <Card className="mt-6 border-rust/30">
            <CardContent className="py-4 text-sm text-rust">{validationError}</CardContent>
          </Card>
        )}

        {result && !validationError && (
          <Card className="mt-6">
            <CardContent className="py-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm text-ink-600">
                  {result.total} result{result.total === 1 ? "" : "s"} for &ldquo;{searchParams.keyword}
                  &rdquo; near {searchParams.location} ({searchParams.radiusMi ?? 25} mi)
                  {result.radiusApplied ? "" : " — showing keyword/location matches; radius could not be verified for this location"}
                </p>
                {result.total > 0 && (
                  <a
                    href={`/api/leads/export?keyword=${encodeURIComponent(searchParams.keyword ?? "")}&location=${encodeURIComponent(searchParams.location ?? "")}&radiusMi=${searchParams.radiusMi ?? 25}`}
                    className="shrink-0"
                  >
                    <Button variant="secondary" size="sm">
                      Export CSV
                    </Button>
                  </a>
                )}
              </div>
              <LeadsTable leads={result.items} />
              <Pagination page={result.page} pageSize={result.pageSize} total={result.total} buildHref={buildHref} />
            </CardContent>
          </Card>
        )}

        {!hasQuery && (
          <Card className="mt-6">
            <CardContent className="py-10 text-center">
              <p className="text-sm font-medium text-ink-900">Search for leads to get started</p>
              <p className="mt-1 text-sm text-ink-600">
                Try &ldquo;Dentist&rdquo; in &ldquo;Hattiesburg, MS&rdquo; — the Phase 1/2 mock dataset covers
                dental clinics in Hattiesburg plus a couple of other demo categories.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </DashboardShell>
  );
}
