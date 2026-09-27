import { toCsv, type CsvColumn } from "./csv";
import type { LeadListItem } from "@/lib/leads/get-leads";

const columns: CsvColumn<LeadListItem>[] = [
  { header: "Business Name", value: (l) => l.business.name },
  { header: "Category", value: (l) => l.business.category },
  { header: "Address", value: (l) => l.business.address },
  { header: "City", value: (l) => l.business.city },
  { header: "State", value: (l) => l.business.state },
  { header: "Postal Code", value: (l) => l.business.postalCode },
  { header: "Phone", value: (l) => l.business.phone },
  { header: "Website", value: (l) => l.business.websiteUrl },
  { header: "Rating", value: (l) => l.business.rating },
  { header: "Review Count", value: (l) => l.business.reviewCount },
  { header: "Data Source", value: (l) => l.business.source },
  { header: "Source Confidence", value: (l) => l.business.sourceConfidence },
  { header: "Status", value: (l) => l.status },
  { header: "Findings", value: (l) => l.findingCount },
  { header: "Profile Score", value: (l) => l.scores.profileScore },
  { header: "Website SEO Score", value: (l) => l.scores.websiteSeoScore },
  { header: "Technical SEO Score", value: (l) => l.scores.technicalSeoScore },
  { header: "Local SEO Score", value: (l) => l.scores.localSeoScore },
  { header: "Content Score", value: (l) => l.scores.contentScore },
  { header: "Conversion Score", value: (l) => l.scores.conversionScore },
  { header: "Opportunity Score", value: (l) => l.scores.opportunityScore },
];

export function leadsToCsv(leads: LeadListItem[]): string {
  return toCsv(leads, columns);
}
