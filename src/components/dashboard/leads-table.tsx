import Link from "next/link";
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/table";
import { ScorePill, OpportunityPill, StatusBadge } from "@/components/dashboard/score-pill";
import type { LeadListItem } from "@/lib/leads/get-leads";

export function LeadsTable({ leads }: { leads: LeadListItem[] }) {
  if (leads.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm font-medium text-ink-900">No leads found</p>
        <p className="mt-1 text-sm text-ink-600">Try a different keyword, location, or radius.</p>
      </div>
    );
  }

  return (
    <Table>
      <Thead>
        <tr>
          <Th>Business</Th>
          <Th>Category</Th>
          <Th>Rating</Th>
          <Th>Reviews</Th>
          <Th>Website</Th>
          <Th>Phone</Th>
          <Th>SEO</Th>
          <Th>Local SEO</Th>
          <Th>Opportunity</Th>
          <Th>Status</Th>
        </tr>
      </Thead>
      <Tbody>
        {leads.map((lead) => (
          <tr key={lead.business.sourceBusinessId} className="hover:bg-ink-950/[.02]">
            <Td>
              <Link
                href={`/leads/${lead.business.sourceBusinessId}`}
                className="font-medium text-ink-900 hover:text-signal"
              >
                {lead.business.name}
              </Link>
              <div className="text-xs text-ink-600">
                {lead.business.city ?? "NOT VERIFIED"}
                {lead.business.state ? `, ${lead.business.state}` : ""}
              </div>
            </Td>
            <Td>{lead.business.category ?? "NOT VERIFIED"}</Td>
            <Td>{lead.business.rating ?? "NOT VERIFIED"}</Td>
            <Td>{lead.business.reviewCount ?? "NOT VERIFIED"}</Td>
            <Td>{lead.business.websiteUrl ? "Yes" : "None"}</Td>
            <Td>{lead.business.phone ?? "NOT VERIFIED"}</Td>
            <Td>
              <ScorePill label="" value={lead.scores.websiteSeoScore} />
            </Td>
            <Td>
              <ScorePill label="" value={lead.scores.localSeoScore} />
            </Td>
            <Td>
              <OpportunityPill value={lead.scores.opportunityScore} />
            </Td>
            <Td>
              <StatusBadge status={lead.status} />
            </Td>
          </tr>
        ))}
      </Tbody>
    </Table>
  );
}
