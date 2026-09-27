"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = [
  "NEW",
  "QUEUED_FOR_AUDIT",
  "AUDITED",
  "QUALIFIED",
  "CONTACTED",
  "RESPONDED",
  "WON",
  "LOST",
  "DISQUALIFIED",
];

export function StatusSelect({ leadId, currentStatus }: { leadId: string; currentStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(newStatus: string) {
    const previous = status;
    setStatus(newStatus);
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/leads/${leadId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setStatus(previous);
      setError(body.error ?? "Failed to update status");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <select
        value={status}
        disabled={saving}
        onChange={(e) => handleChange(e.target.value)}
        className="h-8 rounded border border-ink-600/20 bg-white px-2 text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-signal"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-rust">{error}</p>}
    </div>
  );
}
