"use client";

import { useSession, signOut } from "next-auth/react";

export function AuthBar() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (!session) {
    return (
      <a
        href="/auth/signin"
        className="text-[13px] px-3.5 py-1.5 bg-[var(--fg)] text-white rounded-lg hover:bg-gray-800 transition-colors font-sans font-medium"
      >
        Sign in
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 font-sans">
      <a
        href="/dashboard"
        className="text-[13px] text-[var(--fg-secondary)] hover:text-[var(--fg)] transition-colors font-medium"
      >
        My docs
      </a>
      <span className="text-[var(--border)]">·</span>
      <span className="text-[13px] text-[var(--muted)]">
        {session.user?.name || session.user?.email}
      </span>
      <button
        onClick={() => signOut()}
        className="text-[13px] text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
