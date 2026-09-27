"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-4 w-24 animate-pulse rounded bg-ink-600/10" />;
  }

  if (!session?.user) {
    return (
      <Link href="/login" className="text-xs text-signal hover:underline">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-xs text-ink-800" title={session.user.email ?? undefined}>
        {session.user.email}
      </span>
      <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-xs text-signal hover:underline">
        Sign out
      </button>
    </div>
  );
}
