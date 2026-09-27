import type { AiProposalProvider, ProposalGenerationInput } from "./types";
import type { ProposalDraft } from "@/types/domain";

// Deterministic, non-LLM proposal builder for Phase 1. It composes a draft
// strictly from the findings it's given — every observation cites a real
// finding ID, and if there are no verified findings it says so instead of
// inventing pain points. Phase 4 swaps this for a real LLM-backed provider
// behind the same interface.
export class MockAiProposalProvider implements AiProposalProvider {
  readonly providerName = "mock";

  async generateProposal(input: ProposalGenerationInput): Promise<ProposalDraft> {
    const verifiedFindings = input.findings.filter((f) => f.verified);
    const top3 = verifiedFindings
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .slice(0, 3);

    const place = input.city ? ` in ${input.city}` : "";

    if (top3.length === 0) {
      return {
        subject: `A quick note on ${input.businessName}'s online presence`,
        opening: `I took a look at ${input.businessName}'s${place} online presence and wanted to reach out.`,
        observations: [
          {
            text: "NOT VERIFIED — no audited findings are available yet for this business. Run an audit before sending outreach.",
            findingId: null,
          },
        ],
        solution: "Run a full audit to generate evidence-based observations before drafting outreach.",
        cta: "",
        signature: "",
      };
    }

    return {
      subject: `A few things I noticed about ${input.businessName}'s website`,
      opening: `I was researching ${input.primaryCategory ?? "local businesses"}${place} and came across ${input.businessName}.`,
      observations: top3.map((f) => ({
        text: `${f.title}: ${f.description}`,
        findingId: f.id,
      })),
      solution: top3[0]?.recommendation ?? "",
      cta: "If it's useful, I can send over a short written breakdown — no obligation either way.",
      signature: "",
    };
  }
}

function severityRank(s: string): number {
  switch (s) {
    case "CRITICAL":
      return 4;
    case "HIGH":
      return 3;
    case "MEDIUM":
      return 2;
    default:
      return 1;
  }
}
