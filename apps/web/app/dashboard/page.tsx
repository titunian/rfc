"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

type Plan = {
  id: string;
  slug: string;
  title: string;
  accessRule: string;
  folderPath: string;
  tags: string[];
  createdAt: string;
  expiresAt: string | null;
  commentCount?: number;
};

const ALL_PLANS = "__all__";
const ROOT_FOLDER = "";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state. folderFilter === ALL_PLANS means "no folder filter";
  // folderFilter === "" means "plans at the root only".
  const [folderFilter, setFolderFilter] = useState<string>(ALL_PLANS);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/dashboard");
    }
  }, [status, router]);

  async function reloadPlans() {
    const res = await fetch("/api/plans");
    const data = await res.json();
    setPlans(data.plans || []);
  }

  useEffect(() => {
    if (status === "authenticated") {
      reloadPlans().finally(() => setLoading(false));
    }
  }, [status]);

  const { folders, tags } = useMemo(() => {
    const fMap = new Map<string, number>();
    const tMap = new Map<string, number>();
    for (const p of plans) {
      fMap.set(p.folderPath ?? "", (fMap.get(p.folderPath ?? "") ?? 0) + 1);
      for (const tag of p.tags ?? []) {
        tMap.set(tag, (tMap.get(tag) ?? 0) + 1);
      }
    }
    return {
      folders: Array.from(fMap.entries()).sort(([a], [b]) => a.localeCompare(b)),
      tags: Array.from(tMap.entries()).sort(([a], [b]) => a.localeCompare(b)),
    };
  }, [plans]);

  const visible = useMemo(() => {
    return plans.filter((p) => {
      if (folderFilter !== ALL_PLANS && (p.folderPath ?? "") !== folderFilter) return false;
      if (tagFilter && !(p.tags ?? []).includes(tagFilter)) return false;
      return true;
    });
  }, [plans, folderFilter, tagFilter]);

  async function moveToFolder(plan: Plan) {
    const next = window.prompt(
      "Move to folder (slash-separated, e.g. research/q1). Leave empty for root.",
      plan.folderPath ?? "",
    );
    if (next === null) return;
    const res = await fetch(`/api/plans/${plan.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ folderPath: next }),
    });
    if (!res.ok) {
      alert(`Move failed: ${res.status}`);
      return;
    }
    setMenuOpenFor(null);
    await reloadPlans();
  }

  async function editTags(plan: Plan) {
    const next = window.prompt(
      "Tags (comma-separated). Use lowercase-hyphenated, e.g. api, event-sourcing.",
      (plan.tags ?? []).join(", "),
    );
    if (next === null) return;
    const parsed = next
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const res = await fetch(`/api/plans/${plan.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tags: parsed }),
    });
    if (!res.ok) {
      alert(`Tag update failed: ${res.status}`);
      return;
    }
    setMenuOpenFor(null);
    await reloadPlans();
  }

  if (status === "loading" || status === "unauthenticated") {
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
        <div className="max-w-6xl mx-auto px-6 h-[56px] flex items-center justify-between">
          <a href="/" className="group flex items-center gap-2" aria-label="orfc home">
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-[7px] bg-[var(--fg)] text-[var(--bg)] text-[11px] font-bold tracking-tight shadow-sm group-hover:scale-105 transition-transform">
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

      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-[220px_1fr] gap-8">
        {/* Sidebar: folder tree + tag filter */}
        <aside className="text-[13px] font-sans">
          <SidebarSection label="Folders">
            <SidebarItem
              active={folderFilter === ALL_PLANS}
              onClick={() => setFolderFilter(ALL_PLANS)}
              count={plans.length}
            >
              All
            </SidebarItem>
            {folders.map(([folder, count]) => (
              <SidebarItem
                key={folder || "__root__"}
                active={folderFilter === folder}
                onClick={() => setFolderFilter(folder)}
                count={count}
              >
                <span className="font-mono text-[12px]">
                  {folder === ROOT_FOLDER ? "(root)" : folder}
                </span>
              </SidebarItem>
            ))}
          </SidebarSection>

          {tags.length > 0 && (
            <SidebarSection label="Tags">
              <SidebarItem
                active={tagFilter === null}
                onClick={() => setTagFilter(null)}
              >
                Any tag
              </SidebarItem>
              {tags.map(([tag, count]) => (
                <SidebarItem
                  key={tag}
                  active={tagFilter === tag}
                  onClick={() => setTagFilter(tag)}
                  count={count}
                >
                  <span className="font-mono text-[12px]">#{tag}</span>
                </SidebarItem>
              ))}
            </SidebarSection>
          )}
        </aside>

        {/* Main list */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[1.25rem] font-semibold tracking-tight font-sans text-[var(--fg)]">
              My documents
            </h1>
            <span className="text-[13px] text-[var(--muted)] font-sans">
              {visible.length} {visible.length === 1 ? "doc" : "docs"}
              {folderFilter !== ALL_PLANS || tagFilter ? " (filtered)" : ""}
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <div className="text-[14px] text-[var(--muted)] font-sans animate-pulse">
                Loading…
              </div>
            </div>
          ) : visible.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--bg)] border border-[var(--border-light)] flex items-center justify-center mx-auto mb-4">
                <svg className="w-5 h-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-[14px] text-[var(--fg-secondary)] font-sans mb-1">
                {plans.length === 0 ? "No documents yet" : "No documents match the current filter"}
              </p>
              {plans.length === 0 && (
                <p className="text-[13px] text-[var(--muted)] font-sans">
                  Push your first RFC with{" "}
                  <code className="bg-[var(--code-inline-bg)] text-[var(--fg-secondary)] border border-[var(--border-light)] px-1.5 py-0.5 rounded text-[12px]">
                    orfc push plan.md
                  </code>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-px">
              {visible.map((plan) => (
                <div
                  key={plan.id}
                  className="group relative flex items-start justify-between py-3.5 px-4 -mx-4 rounded-lg hover:bg-[var(--bg)] transition-all duration-150"
                >
                  <a href={`/p/${plan.slug}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
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
                      {(plan.tags ?? []).map((t) => (
                        <span
                          key={t}
                          className="text-[11px] font-mono text-[var(--muted)] bg-[var(--bg)] border border-[var(--border-light)] px-1.5 py-0.5 rounded-full"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {plan.folderPath && (
                        <>
                          <span className="text-[12px] text-[var(--muted)] font-mono">
                            {plan.folderPath}/
                          </span>
                          <span className="text-[12px] text-[var(--border)]">·</span>
                        </>
                      )}
                      <span className="text-[12px] text-[var(--muted)] font-sans">
                        {formatDate(plan.createdAt)}
                      </span>
                      <span className="text-[12px] text-[var(--border)]">·</span>
                      <span className="text-[12px] text-[var(--muted)] font-sans font-mono">
                        {plan.slug}
                      </span>
                    </div>
                  </a>
                  <div className="relative shrink-0 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenFor(menuOpenFor === plan.id ? null : plan.id);
                      }}
                      className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--bg-sidebar)]"
                      aria-label="Row actions"
                    >
                      <svg className="w-4 h-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                        <circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" />
                      </svg>
                    </button>
                    {menuOpenFor === plan.id && (
                      <div
                        className="absolute right-0 top-full mt-1 w-48 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border-light)] shadow-lg z-30 text-[13px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => moveToFolder(plan)}
                          className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-sidebar)] transition-colors"
                        >
                          Move to folder…
                        </button>
                        <button
                          onClick={() => editTags(plan)}
                          className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-sidebar)] transition-colors"
                        >
                          Edit tags…
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SidebarSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] mb-2 px-2">
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function SidebarItem({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
        active
          ? "bg-[var(--bg)] text-[var(--fg)] font-medium"
          : "text-[var(--fg-secondary)] hover:bg-[var(--bg)]"
      }`}
    >
      <span className="truncate">{children}</span>
      {count !== undefined && (
        <span className="text-[11px] text-[var(--muted)] font-mono shrink-0">
          {count}
        </span>
      )}
    </button>
  );
}
