"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex h-screen items-center justify-center bg-paper p-6">
      <div className="max-w-md rounded-md border border-rust/30 bg-rust-soft px-6 py-8 text-center">
        <p className="text-sm font-medium text-rust">Something went wrong</p>
        <p className="mt-1 text-sm text-ink-800">{error.message || "An unexpected error occurred."}</p>
        <button
          onClick={reset}
          className="mt-4 rounded bg-ink-900 px-4 py-2 text-sm text-paper hover:bg-ink-800"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
