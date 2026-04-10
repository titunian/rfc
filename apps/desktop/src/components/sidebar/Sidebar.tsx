import { useEffect, useMemo, useState } from "react";
import { useEditorStore } from "../../stores/editor-store";
import { useAppStore } from "../../stores/app-store";
import { useAuthStore } from "../../stores/auth-store";
import { useCloudStore } from "../../stores/cloud-store";
import { openRecentFile, createNewFile } from "../../lib/file-ops";

// ── helpers ───────────────────────────────────────────────────────

function fileNameFromPath(path: string) {
  return (path.split(/[/\\]/).pop() || path).replace(/\.md$/i, "");
}

function relativeTime(iso: string) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const secs = Math.max(0, Math.floor((now - then) / 1000));
  if (secs < 60) return "now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ── Types ─────────────────────────────────────────────────────────

type DocItem =
  | {
      kind: "local";
      id: string;
      title: string;
      subtitle: string;
      path: string;
      activeHint: string;
      iso?: undefined;
    }
  | {
      kind: "cloud";
      id: string;
      title: string;
      subtitle: string;
      slug: string;
      iso: string;
      activeHint: string;
    };

// ── Component ─────────────────────────────────────────────────────

export function Sidebar() {
  const { filePath, planId, attachCloud } = useEditorStore();
  const {
    recentFiles,
    removeRecentFile,
    openAuthModal,
    openCommandPalette,
  } = useAppStore();
  const { status, email, signOut } = useAuthStore();
  const {
    plans,
    plansLoading,
    plansError,
    fetchPlans,
    fetchPlan,
    clearDocScopedState,
  } = useCloudStore();

  const [search, setSearch] = useState("");
  const signedIn = status === "signed-in";

  // Auto-load cloud plans on sign-in
  useEffect(() => {
    if (signedIn) void fetchPlans();
  }, [signedIn, fetchPlans]);

  // Unified documents list — cloud plans + local files mixed, newest first.
  const items: DocItem[] = useMemo(() => {
    const cloud: DocItem[] = plans.map((p) => ({
      kind: "cloud",
      id: p.id,
      title: p.title || "Untitled",
      subtitle: p.slug,
      slug: p.slug,
      iso: p.createdAt,
      activeHint: p.id,
    }));
    const local: DocItem[] = recentFiles.map((path) => ({
      kind: "local",
      id: path,
      title: fileNameFromPath(path),
      subtitle: path.replace(/^.*\/([^/]+\/[^/]+)$/, "$1"),
      path,
      activeHint: path,
    }));
    // Cloud first (most useful), then local recents
    return [...cloud, ...local];
  }, [plans, recentFiles]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.subtitle.toLowerCase().includes(q)
    );
  }, [items, search]);

  async function openCloudPlan(id: string) {
    const plan = await fetchPlan(id);
    if (!plan) return;
    attachCloud({
      planId: plan.id,
      planSlug: plan.slug,
      planUrl: `${useAuthStore.getState().apiUrl}/p/${plan.slug}`,
      planVersion: plan.currentVersion ?? 1,
      title: plan.title,
      content: plan.content,
    });
    clearDocScopedState();
    void useCloudStore.getState().fetchComments(plan.id);
    void useCloudStore.getState().fetchVersions(plan.id);
  }

  return (
    <aside
      className="h-full flex flex-col select-none shrink-0 relative"
      style={{
        width: "var(--sidebar-width)",
        background: "var(--bg-sidebar)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--panel-radius)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
      }}
    >

      {/* Drag region across the top of the panel — covers traffic-light area */}
      <div
        data-tauri-drag-region
        style={{ height: 32, flexShrink: 0 }}
      />

      {/* Compact brand + search */}
      <div className="px-3 pb-2.5">
        <div
          data-tauri-drag-region
          className="flex items-center gap-2 mb-2.5 pl-[68px]"
        >
          <span
            className="inline-flex items-center justify-center h-[18px] w-[18px] rounded-[5px] text-[9.5px] font-bold shrink-0"
            style={{
              background: "var(--fg)",
              color: "var(--bg)",
              letterSpacing: "-0.02em",
            }}
          >
            o
          </span>
          <span
            className="text-[12px] font-semibold tracking-tight"
            style={{ color: "var(--fg)" }}
          >
            orfc
          </span>
          <span className="flex-1" />
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: signedIn ? "var(--success)" : "var(--muted)",
            }}
            title={signedIn ? `Signed in as ${email}` : "Not signed in"}
          />
        </div>

        {/* Search + quick-new row */}
        <div className="flex items-center gap-1">
          <div className="relative flex-1">
            <svg
              className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--muted)" }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full text-[12px] rounded-[10px] pl-[26px] pr-8 py-[5px] outline-none transition-colors"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border-subtle)",
                color: "var(--fg)",
              }}
            />
            <button
              onClick={openCommandPalette}
              className="absolute right-[4px] top-1/2 -translate-y-1/2 font-mono text-[9.5px] px-1 py-[1px] rounded transition-colors"
              style={{
                background: "var(--bg-sidebar)",
                border: "1px solid var(--border-subtle)",
                color: "var(--fg-tertiary)",
              }}
              title="Command palette · ⌘K"
            >
              ⌘K
            </button>
          </div>
          <button
            onClick={() => void createNewFile()}
            className="flex items-center justify-center rounded-[10px] transition-colors shrink-0"
            style={{
              width: 26,
              height: 26,
              color: "var(--fg-secondary)",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-hover)";
              e.currentTarget.style.color = "var(--fg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg)";
              e.currentTarget.style.color = "var(--fg-secondary)";
            }}
            title="New document · ⌘N"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Documents list */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-2">
        {!signedIn && items.length === 0 ? (
          <div className="px-3 py-5 text-center">
            <p className="text-[11.5px] mb-2.5" style={{ color: "var(--fg-tertiary)" }}>
              Connect your account to see your drafts.
            </p>
            <button
              onClick={openAuthModal}
              className="w-full text-[11.5px] font-medium px-2 py-1.5 rounded-[10px] transition-colors"
              style={{
                color: "var(--fg-secondary)",
                border: "1px dashed var(--border)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--fg-tertiary)";
                e.currentTarget.style.color = "var(--fg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--fg-secondary)";
              }}
            >
              Sign in to orfc.dev
            </button>
          </div>
        ) : plansLoading && plans.length === 0 ? (
          <p className="text-[11.5px] px-3 pt-3" style={{ color: "var(--fg-tertiary)" }}>
            Loading…
          </p>
        ) : plansError && plans.length === 0 ? (
          <p className="text-[11.5px] px-3 pt-3" style={{ color: "var(--danger)" }}>
            {plansError}
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-[11.5px] px-3 pt-3" style={{ color: "var(--fg-tertiary)" }}>
            {search ? "No matches." : "No documents yet. ⌘N to start."}
          </p>
        ) : (
          <div className="space-y-px">
            {filtered.map((it) => {
              const active =
                (it.kind === "local" && it.path === filePath) ||
                (it.kind === "cloud" && it.id === planId);
              return (
                <div key={`${it.kind}-${it.id}`} className="group relative">
                  <button
                    onClick={() => {
                      if (it.kind === "cloud") void openCloudPlan(it.id);
                      else void openRecentFile(it.path);
                    }}
                    className="w-full text-left px-2 py-[6px] rounded-[10px] flex items-center gap-2 transition-colors"
                    style={{
                      background: active ? "var(--bg-active)" : "transparent",
                      color: active ? "var(--fg)" : "var(--fg-secondary)",
                    }}
                    onMouseEnter={(e) => {
                      if (!active)
                        e.currentTarget.style.background = "var(--bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      if (!active)
                        e.currentTarget.style.background = "transparent";
                    }}
                    title={it.subtitle}
                  >
                    {/* Terminal-style kind glyph */}
                    <span
                      className="shrink-0 font-mono text-[10px] tabular-nums"
                      style={{
                        color:
                          it.kind === "cloud"
                            ? "var(--accent)"
                            : "var(--fg-tertiary)",
                      }}
                    >
                      {it.kind === "cloud" ? "●" : "○"}
                    </span>
                    <span className="text-[12.5px] font-medium truncate flex-1">
                      {it.title}
                    </span>
                    {it.kind === "cloud" && it.iso && (
                      <span
                        className="text-[10px] font-mono tabular-nums shrink-0"
                        style={{ color: "var(--fg-tertiary)" }}
                      >
                        {relativeTime(it.iso)}
                      </span>
                    )}
                    {it.kind === "local" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecentFile(it.path);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center justify-center rounded"
                        style={{
                          width: 14,
                          height: 14,
                          color: "var(--muted)",
                        }}
                        title="Remove from recents"
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </button>
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full"
                      style={{ background: "var(--accent)" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer — account chip only. Publish lives in the editor action rail. */}
      <div
        className="px-1.5 py-1.5"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        {signedIn ? (
          <>
            <div
              className="flex items-center gap-2 px-2 py-[5px] rounded-[10px]"
              title={email || ""}
            >
              <span
                className="flex items-center justify-center rounded-full shrink-0"
                style={{
                  width: 16,
                  height: 16,
                  background: "var(--bg)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--fg-secondary)",
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                {(email || "?").trim().charAt(0).toUpperCase()}
              </span>
              <span
                className="text-[10.5px] truncate flex-1"
                style={{ color: "var(--fg-tertiary)" }}
              >
                {email}
              </span>
              <button
                onClick={signOut}
                className="text-[9.5px] transition-colors"
                style={{ color: "var(--muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                title="Sign out"
              >
                Sign out
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={openAuthModal}
            className="w-full flex items-center gap-2 text-[12px] font-medium px-2 py-[6px] rounded-[10px] transition-colors"
            style={{
              color: "var(--fg-secondary)",
              border: "1px solid var(--border-subtle)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-hover)";
              e.currentTarget.style.color = "var(--fg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--fg-secondary)";
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 17l5-5-5-5" />
              <path d="M15 12H3" />
              <path d="M21 19V5a2 2 0 0 0-2-2h-4" />
            </svg>
            Sign in to orfc.dev
          </button>
        )}
      </div>
    </aside>
  );
}
