"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

interface Note {
  id: string;
  body: string;
  createdAt: string;
  authorName: string | null;
  authorEmail: string;
}

export function NotesPanel({ leadId, initialNotes }: { leadId: string; initialNotes: Note[] }) {
  const { data: session } = useSession();
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/leads/${leadId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save note");
      return;
    }

    const { note } = await res.json();
    setNotes([note, ...notes]);
    setDraft("");
  }

  return (
    <div>
      {notes.length === 0 && <p className="text-sm text-ink-600">No notes yet.</p>}
      <ul className="space-y-3">
        {notes.map((n) => (
          <li key={n.id} className="border-b border-ink-600/10 pb-3 last:border-0">
            <p className="text-sm text-ink-900">{n.body}</p>
            <p className="mt-1 text-xs text-ink-600">
              {n.authorName ?? n.authorEmail} · {new Date(n.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>

      {session?.user ? (
        <form onSubmit={handleAdd} className="mt-4 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a note…"
            rows={2}
            className="w-full rounded border border-ink-600/20 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-600/50 focus:outline-none focus:ring-2 focus:ring-signal"
          />
          {error && <p className="text-xs text-rust">{error}</p>}
          <Button type="submit" size="sm" disabled={saving || !draft.trim()}>
            {saving ? "Saving…" : "Add note"}
          </Button>
        </form>
      ) : (
        <p className="mt-4 text-xs text-ink-600">
          <a href="/login" className="text-signal hover:underline">
            Sign in
          </a>{" "}
          to add notes.
        </p>
      )}
    </div>
  );
}
