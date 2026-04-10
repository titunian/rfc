"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

type Plan = {
  id: string;
  slug: string;
  title: string;
  accessRule: string;
  createdAt: string;
  expiresAt: string | null;
  commentCount?: number;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/dashboard");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/plans")
        .then((res) => res.json())
        .then((data) => {
          setPlans(data.plans || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status]);

  if (status === "loading" || (status === "unauthenticated")) {
    return (
      <div className="min-h-screen bg-[var(--bg-warm)] flex items-center justify-center">
        <div className="text-[14px] text-[var(--muted)] font-sans animate-pulse">
          Loading…
        </div>
      </div>
    );
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-warm)]">
      {/* Header */}
      <header
        className="border-b border-[var(--border-light)] sticky top-0 z-40"
        style={{
          background: "var(--header-bg)",
          backdropFilter: "saturate(180%) blur(14px)",
          WebkitBackdropFilter: "saturate(180%) blur(14px)",
        }}
      >
        <div className="max-w-3xl mx-auto px-6 h-[56px] flex items-center justify-between">
          <a
            href="/"
            className="group flex items-center gap-2"
            aria-label="orfc home"
          >
            <span
              className="inline-flex items-center justify-center h-6 w-6 rounded-[7px] bg-[var(--fg)] text-[var(--bg)] text-[11px] font-bold tracking-tight shadow-sm group-hover:scale-105 transition-transform"
              aria-hidden="true"
            >
              o
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.01em] font-sans text-[var(--fg)] group-hover:text-[var(--fg-secondary)] transition-colors">
              orfc
            </span>
          </a>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[var(--fg-secondary)] font-sans truncate max-w-[220px]">
              {session?.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-[12px] text-[var(--muted)] hover:text-[var(--fg)] font-sans transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[1.25rem] font-semibold tracking-tight font-sans text-[var(--fg)]">
            My documents
          </h1>
          <span className="text-[13px] text-[var(--muted)] font-sans">
            {plans.length} {plans.length === 1 ? "doc" : "docs"}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="text-[14px] text-[var(--muted)] font-sans animate-pulse">
              Loading…
            </div>
          </div>
        ) : plans.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--bg)] border border-[var(--border-light)] flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-5 h-5 text-[var(--muted)]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <p className="text-[14px] text-[var(--fg-secondary)] font-sans mb-1">
              No documents yet
            </p>
            <p className="text-[13px] text-[var(--muted)] font-sans">
              Push your first RFC with{" "}
              <code className="bg-[var(--code-inline-bg)] text-[var(--fg-secondary)] border border-[var(--border-light)] px-1.5 py-0.5 rounded text-[12px]">
                orfc push plan.md
              </code>
            </p>
          </div>
        ) : (
          <div className="space-y-px">
            {plans.map((plan) => (
              <a
                key={plan.id}
                href={`/p/${plan.slug}`}
                className="group flex items-center justify-between py-3.5 px-4 -mx-4 rounded-lg hover:bg-[var(--bg)] transition-all duration-150"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-[14px] font-medium text-[var(--fg)] font-sans truncate group-hover:text-[var(--accent)] transition-colors">
                      {plan.title || "Untitled"}
                    </h2>
                    <span
                      className={`shrink-0 text-[10px] font-semibold font-sans uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                        plan.accessRule === "anyone"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
                      }`}
                    >
                      {plan.accessRule === "anyone" ? "Public" : "Private"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[12px] text-[var(--muted)] font-sans">
                      {formatDate(plan.createdAt)}
                    </span>
                    <span className="text-[12px] text-[var(--border)]">·</span>
                    <span className="text-[12px] text-[var(--muted)] font-sans font-mono">
                      {plan.slug}
                    </span>
                  </div>
                </div>
                <svg
                  className="w-4 h-4 text-[var(--border)] group-hover:text-[var(--muted)] transition-colors shrink-0 ml-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
