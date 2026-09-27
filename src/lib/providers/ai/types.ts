// Provider-agnostic AI interface. Swappable LLM backend; the app never
// imports a vendor SDK directly outside this module.

import type { AuditFindingInput, ProposalDraft } from "@/types/domain";

export interface ProposalGenerationInput {
  businessName: string;
  city: string | null;
  primaryCategory: string | null;
  // Only real, persisted findings may be passed in — the generator is not
  // allowed to invent findings, and downstream code must reject any
  // observation that doesn't map back to one of these.
  findings: Array<AuditFindingInput & { id: string }>;
}

export interface AiProposalProvider {
  readonly providerName: string;
  generateProposal(input: ProposalGenerationInput): Promise<ProposalDraft>;
}
