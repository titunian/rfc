"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Folder,
  FolderOpen,
  Library,
  Hash,
  MoreHorizontal,
  FileText,
} from "lucide-react";
import { TopBar } from "@/components/top-bar";

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

// Next 14 requires components that use useSearchParams to be wrapped
// in a Suspense boundary, otherwise the whole route opts out of static
// prerender with a build-time error. The wrapper below is the bare
// minimum to satisfy that — the actual work is in DashboardInner.
export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state, seeded from URL so /dashboard?folder=x&tag=y is
  // a shareable view. folderFilter === ALL_PLANS = no folder filter;
  // folderFilter === "" = root-only.
  const urlFolder = searchParams.get("folder");
  const urlTag = searchParams.get("tag");
  const [folderFilter, setFolderFilter] = useState<string>(
    urlFolder !== null ? urlFolder : ALL_PLANS,
  );
  const [tagFilter, setTagFilter] = useState<string | null>(urlTag);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  // Push filter changes to the URL so they're bookmarkable and the
  // back button works as a viewer expects.
  const updateUrl = useCallback(
    (folder: string, tag: string | null) => {
      const params = new URLSearchParams();
      if (folder !== ALL_PLANS) params.set("folder", folder);
      if (tag) params.set("tag", tag);
      const qs = params.toString();
      router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false });
    },
    [router],
  );

  const onFolderChange = useCallback(
    (next: string) => {
      setFolderFilter(next);
      updateUrl(next, tagFilter);
    },
    [tagFilter, updateUrl],
  );

  const onTagChange = useCallback(
    (next: string | null) => {
      setTagFilter(next);
      updateUrl(folderFilter, next);
    },
    [folderFilter, updateUrl],
  );

  // If the URL changes (e.g. clicking a tag chip on a plan page → /dashboard?tag=foo),
  // sync state back from the URL.
  useEffect(() => {
    const f = searchParams.get("folder");
    setFolderFilter(f !== null ? f : ALL_PLANS);
    setTagFilter(searchParams.get("tag"));
  }, [searchParams]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/dashboard");
    }
  }, [status, router]);

  async function reloadPlans() {
    try {
      const res = await fetch("/api/plans");
      if (!res.ok) throw new Error(`Failed to load documents (${res.status})`);
      const data = await res.json();
      setPlans(data.plans || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    }
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
    <div className="min-h-screen bg-[var(--app,var(--bg-warm))] pt-3">
      <TopBar>
        {/* Left slot empty on dashboard — the logo carries the context. */}
        <div />
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[12.5px] text-[var(--muted)] truncate max-w-[220px]">
            {session?.user?.email}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-[12px] text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
          >
            Log out
          </button>
        </div>
      </TopBar>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16 grid grid-cols-[200px_1fr] gap-10">
        {/* Sidebar: folder tree + tag filter */}
        <aside className="text-[13px]">
          <SidebarSection label="Folders">
            <SidebarItem
              active={folderFilter === ALL_PLANS}
              onClick={() => onFolderChange(ALL_PLANS)}
              count={plans.length}
              icon={<Library size={14} strokeWidth={1.6} />}
            >
              All
            </SidebarItem>
            {folders.map(([folder, count]) => {
              const isActive = folderFilter === folder;
              return (
              <SidebarItem
                key={folder || "__root__"}
                active={isActive}
                onClick={() => onFolderChange(folder)}
                count={count}
                icon={
                  isActive ? (
                    <FolderOpen size={14} strokeWidth={1.6} />
                  ) : (
                    <Folder size={14} strokeWidth={1.6} />
                  )
                }
              >
                {folder === ROOT_FOLDER ? (
                  <span className="italic opacity-80">Root</span>
                ) : (
                  folder
                )}
              </SidebarItem>
              );
            })}
          </SidebarSection>

          {tags.length > 0 && (
            <SidebarSection label="Tags">
              <SidebarItem
                active={tagFilter === null}
                onClick={() => onTagChange(null)}
                icon={<Hash size={14} strokeWidth={1.6} style={{ opacity: 0.55 }} />}
              >
                Any tag
              </SidebarItem>
              {tags.map(([tag, count]) => (
                <SidebarItem
                  key={tag}
                  active={tagFilter === tag}
                  onClick={() => onTagChange(tag)}
                  count={count}
                  icon={<Hash size={14} strokeWidth={1.6} />}
                >
                  {tag}
                </SidebarItem>
              ))}
            </SidebarSection>
          )}
        </aside>

        {/* Main list */}
        <div>
          <div className="flex items-baseline justify-between mb-8 gap-4">
            <div>
              <h1
                className="text-[26px] font-semibold leading-[1.1] text-[var(--fg)]"
                style={{ letterSpacing: "-0.022em" }}
              >
                Documents
              </h1>
              {(folderFilter !== ALL_PLANS || tagFilter) && (
                <div className="mt-2 flex items-center gap-2 text-[12px] text-[var(--muted)]">
                  <span>Filtered by</span>
                  {folderFilter !== ALL_PLANS && (
                    <span className="inline-flex items-center gap-1 text-[var(--fg-secondary)]">
                      <Folder size={11} strokeWidth={1.6} />
                      <span className="font-mono">
                        {folderFilter === ROOT_FOLDER ? "(root)" : folderFilter}
                      </span>
                    </span>
                  )}
                  {tagFilter && (
                    <span className="font-mono text-[var(--fg-secondary)]">#{tagFilter}</span>
                  )}
                  <button
                    onClick={() => {
                      onFolderChange(ALL_PLANS);
                      onTagChange(null);
                    }}
                    className="text-[var(--muted)] hover:text-[var(--fg)] transition-colors underline underline-offset-2 decoration-dotted"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
            <span className="text-[12.5px] text-[var(--muted)] tabular shrink-0" data-num>
              {visible.length} {visible.length === 1 ? "doc" : "docs"}
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <div className="text-[14px] text-[var(--muted)] font-sans animate-pulse">
                Loading…
              </div>
            </div>
          ) : error ? (
            <div className="py-20 text-center">
              <p className="text-[14px] text-red-600 font-sans mb-2">{error}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  reloadPlans().finally(() => setLoading(false));
                }}
                className="text-[13px] text-[var(--muted)] hover:text-[var(--fg)] font-sans underline"
              >
                Try again
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--bg)] border border-[var(--border-light)] flex items-center justify-center mx-auto mb-4">
                <FileText
                  size={20}
                  strokeWidth={1.5}
                  className="text-[var(--muted)]"
                />
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
            <div className="-mx-3">
              {visible.map((plan) => (
                <div
                  key={plan.id}
                  className="group relative grid grid-cols-[1fr_auto] items-center gap-4 py-2 px-3 rounded-md hover:bg-[var(--button-hover)] transition-colors duration-100"
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    {/* Type indicator — 1 char, opacity-based, no chip */}
                    <span
                      className={`shrink-0 inline-flex items-center justify-center w-4 text-[11px] tabular ${
                        plan.accessRule === "anyone"
                          ? "text-[var(--fg-secondary)]"
                          : "text-[var(--muted)]"
                      }`}
                      title={plan.accessRule === "anyone" ? "Public" : "Private"}
                      aria-hidden="true"
                    >
                      {plan.accessRule === "anyone" ? "○" : "●"}
                    </span>

                    <a
                      href={`/p/${plan.slug}`}
                      className="text-[13.5px] text-[var(--fg)] truncate group-hover:text-[var(--accent)] transition-colors"
                    >
                      {plan.title || "Untitled"}
                    </a>

                    {plan.folderPath && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFolderChange(plan.folderPath);
                        }}
                        className="shrink-0 inline-flex items-center gap-1 text-[11.5px] text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
                        title={`Filter by folder: ${plan.folderPath}`}
                      >
                        <Folder size={11} strokeWidth={1.6} className="opacity-70" />
                        <span className="font-mono opacity-90">{plan.folderPath}</span>
                      </button>
                    )}

                    {(plan.tags ?? []).slice(0, 3).map((t) => (
                      <button
                        key={t}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTagChange(t);
                        }}
                        className="shrink-0 text-[11px] font-mono text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
                        title={`Filter by tag: ${t}`}
                      >
                        #{t}
                      </button>
                    ))}
                    {(plan.tags ?? []).length > 3 && (
                      <span className="shrink-0 text-[11px] text-[var(--muted)] opacity-60">
                        +{(plan.tags ?? []).length - 3}
                      </span>
                    )}
                  </div>

                  {/* Right-aligned meta + actions. Date is the resting
                      column; the dot-menu replaces it on hover. */}
                  <div className="flex items-center justify-end gap-3 shrink-0">
                    <span
                      className="text-[11.5px] text-[var(--muted)] tabular w-[64px] text-right group-hover:opacity-0 transition-opacity"
                      data-num
                    >
                      {formatDate(plan.createdAt)}
                    </span>

                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenFor(menuOpenFor === plan.id ? null : plan.id);
                        }}
                        className="absolute right-0 -top-3 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--fg)] transition-all duration-100"
                        aria-label="Row actions"
                      >
                        <MoreHorizontal size={14} strokeWidth={1.8} />
                      </button>
                      {menuOpenFor === plan.id && (
                        <div
                          className="absolute right-0 top-5 w-44 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border)] shadow-[0_8px_24px_rgba(0,0,0,0.08)] z-30 text-[12.5px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => moveToFolder(plan)}
                            className="w-full text-left px-3 py-1.5 text-[var(--fg-secondary)] hover:bg-[var(--button-hover)] hover:text-[var(--fg)] transition-colors"
                          >
                            Move to folder…
                          </button>
                          <button
                            onClick={() => editTags(plan)}
                            className="w-full text-left px-3 py-1.5 text-[var(--fg-secondary)] hover:bg-[var(--button-hover)] hover:text-[var(--fg)] transition-colors"
                          >
                            Edit tags…
                          </button>
                        </div>
                      )}
                    </div>
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
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`group w-full flex items-center gap-2 px-2 py-[5px] rounded-md text-left transition-colors duration-100 ${
        active
          ? "bg-[var(--button-hover)] text-[var(--fg)]"
          : "text-[var(--fg-secondary)] hover:bg-[var(--button-hover)] hover:text-[var(--fg)]"
      }`}
    >
      {icon && (
        <span
          className={`shrink-0 w-[14px] h-[14px] flex items-center justify-center transition-colors ${
            active ? "text-[var(--fg)]" : "text-[var(--muted)] group-hover:text-[var(--fg-secondary)]"
          }`}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <span className={`truncate flex-1 ${active ? "font-medium" : ""}`}>{children}</span>
      {count !== undefined && (
        <span className="text-[11px] text-[var(--muted)] tabular shrink-0">
          {count}
        </span>
      )}
    </button>
  );
}

