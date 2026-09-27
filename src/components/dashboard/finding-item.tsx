import { Badge } from "@/components/ui/badge";
import type { AuditFindingInput } from "@/types/domain";

const severityTone: Record<string, "neutral" | "signal" | "amber" | "rust"> = {
  LOW: "neutral",
  MEDIUM: "amber",
  HIGH: "rust",
  CRITICAL: "rust",
};

export function FindingItem({ finding }: { finding: AuditFindingInput & { id: string } }) {
  return (
    <div className="border-b border-ink-600/10 py-4 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-900">{finding.title}</p>
        <Badge tone={severityTone[finding.severity] ?? "neutral"}>{finding.severity}</Badge>
      </div>
      <p className="mt-1 text-sm text-ink-800">{finding.description}</p>
      <dl className="mt-2 grid grid-cols-1 gap-1 text-xs text-ink-600 md:grid-cols-2">
        <div>
          <dt className="inline font-medium">Evidence: </dt>
          <dd className="inline">{finding.evidence}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Verified: </dt>
          <dd className="inline">{finding.verified ? "true" : "NOT VERIFIED"}</dd>
        </div>
        {finding.sourceUrl && (
          <div className="md:col-span-2">
            <dt className="inline font-medium">Source: </dt>
            <dd className="inline">{finding.sourceUrl}</dd>
          </div>
        )}
        <div className="md:col-span-2">
          <dt className="inline font-medium">Recommendation: </dt>
          <dd className="inline">{finding.recommendation}</dd>
        </div>
      </dl>
    </div>
  );
}
