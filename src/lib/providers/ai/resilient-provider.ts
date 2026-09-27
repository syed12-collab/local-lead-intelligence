// Decorator: wraps a primary AiProposalProvider with the deterministic
// MockAiProposalProvider as a fallback. If the primary throws for any
// reason — network failure, an unparseable response, or every
// observation failing finding-ID validation — this falls back to the
// mock's deterministic, always-safe output rather than ever surfacing a
// half-formed or unvalidated AI response to the UI.

import type { AiProposalProvider, ProposalGenerationInput } from "./types";
import type { ProposalDraft } from "@/types/domain";
import { MockAiProposalProvider } from "./mock-provider";

export class ResilientAiProposalProvider implements AiProposalProvider {
  readonly providerName: string;
  private readonly primary: AiProposalProvider;
  private readonly fallback: AiProposalProvider;

  constructor(primary: AiProposalProvider, fallback: AiProposalProvider = new MockAiProposalProvider()) {
    this.primary = primary;
    this.fallback = fallback;
    this.providerName = `${primary.providerName}(fallback:${fallback.providerName})`;
  }

  async generateProposal(input: ProposalGenerationInput): Promise<ProposalDraft> {
    try {
      return await this.primary.generateProposal(input);
    } catch (err) {
      console.error(
        `[ResilientAiProposalProvider] primary provider "${this.primary.providerName}" failed, falling back to "${this.fallback.providerName}":`,
        err instanceof Error ? err.message : err,
      );
      return this.fallback.generateProposal(input);
    }
  }
}
