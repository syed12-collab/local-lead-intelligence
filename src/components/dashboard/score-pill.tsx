import { Badge } from "@/components/ui/badge";

// A score's color communicates opportunity, not "quality" — a LOW seo
// score is HIGH opportunity, so this pill is deliberately framed as
// "score value" only; callers decide what tone means in context.
export function ScorePill({ label, value }: { label: string; value: number }) {
  const tone = value >= 70 ? "signal" : value >= 40 ? "amber" : "rust";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-ink-600">{label}</span>
      <Badge tone={tone} className="w-fit text-sm px-2.5 py-1 font-semibold">
        {value}
      </Badge>
    </div>
  );
}

export function OpportunityPill({ value }: { value: number }) {
  const tone = value >= 70 ? "rust" : value >= 40 ? "amber" : "signal";
  const label = value >= 70 ? "High opportunity" : value >= 40 ? "Moderate opportunity" : "Low opportunity";
  return (
    <Badge tone={tone} className="text-xs px-2.5 py-1 font-medium">
      {label} · {value}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: "neutral" | "signal" | "amber" | "rust"; label: string }> = {
    NEW: { tone: "neutral", label: "New" },
    QUEUED_FOR_AUDIT: { tone: "amber", label: "Queued for audit" },
    AUDITED: { tone: "signal", label: "Audited" },
    QUALIFIED: { tone: "signal", label: "Qualified" },
    CONTACTED: { tone: "amber", label: "Contacted" },
    RESPONDED: { tone: "signal", label: "Responded" },
    WON: { tone: "signal", label: "Won" },
    LOST: { tone: "rust", label: "Lost" },
    DISQUALIFIED: { tone: "rust", label: "Disqualified" },
  };
  const entry = map[status] ?? { tone: "neutral" as const, label: status };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}
