"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ProposalDraft } from "@/types/domain";

export function ProposalCard({ proposal }: { proposal: ProposalDraft }) {
  const [copied, setCopied] = useState(false);

  const fullText = [
    `Subject: ${proposal.subject}`,
    "",
    proposal.opening,
    "",
    ...proposal.observations.map((o) => `• ${o.text}`),
    "",
    proposal.solution,
    "",
    proposal.cta,
    "",
    proposal.signature,
  ]
    .filter((line) => line !== "")
    .join("\n");

  async function handleCopy() {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <p className="text-sm font-medium text-ink-900">{proposal.subject}</p>
      <p className="mt-3 text-sm text-ink-800">{proposal.opening}</p>

      {proposal.observations.length > 0 && (
        <ul className="mt-3 space-y-2">
          {proposal.observations.map((o, i) => (
            <li key={i} className="text-sm text-ink-800">
              <span className="mr-1 text-ink-600">•</span>
              {o.text}
              {o.findingId === null && (
                <span className="ml-1 text-xs text-rust">(not backed by a verified finding)</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {proposal.solution && <p className="mt-3 text-sm text-ink-800">{proposal.solution}</p>}
      {proposal.cta && <p className="mt-3 text-sm text-ink-800">{proposal.cta}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="secondary" size="sm" disabled title="Editing arrives in a later phase">
          Edit
        </Button>
        <Button variant="secondary" size="sm" disabled title="Requires explicit send approval — not built in Phase 1">
          Email
        </Button>
        <Button variant="secondary" size="sm" disabled title="Requires explicit send approval — not built in Phase 1">
          WhatsApp
        </Button>
      </div>
      <p className="mt-2 text-xs text-ink-600">
        Sending is intentionally disabled in Phase 1 — outreach always requires explicit approval before anything goes out.
      </p>
    </div>
  );
}
