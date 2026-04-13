// ── Concepts list panel ──────────────────────────────────────────
//
// Renders all extracted concepts grouped by type, with search/filter.
// Shown as a right panel when toggled via CMD+Shift+G.

import { useState, useMemo } from "react";
import { useConceptsStore, type ConceptEntry } from "../../stores/concepts-store";
import { useEditorStore } from "../../stores/editor-store";
import { useCloudStore } from "../../stores/cloud-store";
import { useAuthStore } from "../../stores/auth-store";
import { useAppStore } from "../../stores/app-store";
import { openRecentFile } from "../../lib/file-ops";
import type { ConceptType } from "../../lib/extract-concepts";
import { ConceptGraph } from "./ConceptGraph";

type ViewMode = "list" | "graph";

// ── Type config ──────────────────────────────────────────────────

const TYPE_META: Record<ConceptType, { label: string; icon: string; color: string; tooltip: string }> = {
  system:   { label: "Systems",   icon: "S", color: "var(--accent)",       tooltip: "System — a technology, service, or infrastructure component" },
  decision: { label: "Decisions", icon: "D", color: "var(--gold)",         tooltip: "Decision — an architectural or design choice" },
  pattern:  { label: "Patterns",  icon: "P", color: "var(--success)",      tooltip: "Pattern — a recurring design pattern or practice" },
  question: { label: "Questions", icon: "?", color: "var(--danger)",       tooltip: "Question — an open question or unresolved discussion" },
  person:   { label: "People",    icon: "@", color: "var(--fg-tertiary)",  tooltip: "Person — a team member or stakeholder" },
};

const TYPE_ORDER: ConceptType[] = ["system", "decision", "pattern", "question", "person"];

// ── Component ────────────────────────────────────────────────────

export function ConceptsList({ fullscreen = false }: { fullscreen?: boolean }) {
  const [search, setSearch] = useState("");
  const [expandedConcept, setExpandedConcept] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<ConceptType | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("graph");

  const allEntries = useConceptsStore((s) => s.allEntries)();
  const searchConcepts = useConceptsStore((s) => s.searchConcepts);

  const entries = useMemo(() => {
    let results = search.trim() ? searchConcepts(search) : allEntries;
    if (typeFilter) {
      results = results.filter((e) => e.concept.type === typeFilter);
    }
    return results;
  }, [search, allEntries, searchConcepts, typeFilter]);

  // Group by type
  const grouped = useMemo(() => {
    const groups: Record<string, ConceptEntry[]> = {};
    for (const entry of entries) {
      const t = entry.concept.type;
      if (!groups[t]) groups[t] = [];
      groups[t].push(entry);
    }
    return groups;
  }, [entries]);

  const toggleConcepts = useAppStore((s) => s.toggleConcepts);

  return (
    <aside
      className={`flex flex-col select-none ${fullscreen ? "flex-1" : "h-full shrink-0"}`}
      style={{
        width: fullscreen ? "100%" : 280,
        height: fullscreen ? "100%" : undefined,
        background: fullscreen ? "var(--bg)" : "var(--bg-sidebar)",
        ...(fullscreen
          ? {}
          : {
              borderRadius: "var(--panel-radius)",
              border: "1px solid var(--border-subtle)",
              boxShadow: "var(--shadow-sm)",
            }),
      }}
    >
      {/* Header */}
      <div
        className={fullscreen ? "px-5 pt-4 pb-3" : "px-3 pt-3 pb-2"}
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          {fullscreen && (
            <button
              onClick={toggleConcepts}
              className="flex items-center justify-center rounded-[8px] transition-colors mr-1"
              style={{ width: 28, height: 28, color: "var(--fg-tertiary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--fg)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fg-tertiary)"; }}
              title="Back to editor · ⌘⇧G"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
          </svg>
          <span className={`${fullscreen ? "text-[15px]" : "text-[12px]"} font-semibold tracking-tight`} style={{ color: "var(--fg)" }}>
            Knowledge Graph
          </span>
          <span className="text-[10px] font-mono tabular-nums" style={{ color: "var(--fg-tertiary)" }}>
            {allEntries.length} concepts
          </span>
          <span className="flex-1" />
          {/* List / Graph toggle */}
          <div
            className="flex rounded-[6px] overflow-hidden"
            style={{ border: "1px solid var(--border-subtle)" }}
          >
            {(["list", "graph"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="text-[10px] font-medium px-1.5 py-[2px] transition-colors"
                style={{
                  background: viewMode === mode ? "var(--bg-active)" : "transparent",
                  color: viewMode === mode ? "var(--fg)" : "var(--fg-tertiary)",
                }}
                title={mode === "list" ? "List view" : "Graph view"}
              >
                {mode === "list" ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" />
                    <line x1="8.5" y1="7.5" x2="15.5" y2="16.5" /><line x1="15.5" y1="7.5" x2="8.5" y2="16.5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={toggleConcepts}
            className="flex items-center justify-center rounded-[5px] transition-colors"
            style={{ width: 20, height: 20, color: "var(--muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-hover)";
              e.currentTarget.style.color = "var(--fg-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--muted)";
            }}
            title="Close concepts panel"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
            width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ color: "var(--muted)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter concepts..."
            className="w-full text-[12px] rounded-[10px] pl-[26px] pr-2 py-[5px] outline-none transition-colors"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border-subtle)",
              color: "var(--fg)",
            }}
          />
        </div>

        {/* Type filter chips */}
        <div className="flex gap-1 mt-2 flex-wrap">
          {TYPE_ORDER.map((t) => {
            const meta = TYPE_META[t];
            const count = grouped[t]?.length || 0;
            const isActive = typeFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(isActive ? null : t)}
                title={meta.tooltip}
                className="text-[10px] font-medium px-1.5 py-[2px] rounded-md transition-colors"
                style={{
                  background: isActive ? meta.color : "var(--bg)",
                  color: isActive ? "#fff" : "var(--fg-tertiary)",
                  border: `1px solid ${isActive ? meta.color : "var(--border-subtle)"}`,
                  opacity: count === 0 && !isActive ? 0.4 : 1,
                }}
              >
                {meta.icon} {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content area: list or graph */}
      {viewMode === "graph" ? (
        <div className="flex-1 overflow-hidden">
          <ConceptGraph filterQuery={search || undefined} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-1.5 py-2">
          {entries.length === 0 ? (
            <p className="text-[11.5px] px-3 pt-3 text-center" style={{ color: "var(--fg-tertiary)" }}>
              {search ? "No matching concepts." : "No concepts extracted yet. Open a document to begin."}
            </p>
          ) : (
            TYPE_ORDER.filter((t) => grouped[t]?.length).map((type) => (
              <div key={type} className="mb-3">
                {/* Group heading */}
                {!typeFilter && (
                  <div
                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1"
                    style={{ color: TYPE_META[type].color }}
                  >
                    {TYPE_META[type].label}
                  </div>
                )}

                {/* Items */}
                <div className="space-y-px">
                  {grouped[type]!.map((entry) => (
                    <ConceptItem
                      key={entry.concept.name}
                      entry={entry}
                      isExpanded={expandedConcept === entry.concept.name}
                      onToggle={() =>
                        setExpandedConcept(
                          expandedConcept === entry.concept.name ? null : entry.concept.name
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
}

// ── Single concept item ──────────────────────────────────────────

function ConceptItem({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: ConceptEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { concept, planIds, planTitles } = entry;
  const meta = TYPE_META[concept.type];

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full text-left px-2 py-[5px] rounded-[8px] flex items-center gap-2 transition-colors group"
        style={{
          background: isExpanded ? "var(--bg-active)" : "transparent",
          color: "var(--fg-secondary)",
        }}
        onMouseEnter={(e) => {
          if (!isExpanded) e.currentTarget.style.background = "var(--bg-hover)";
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) e.currentTarget.style.background = "transparent";
        }}
      >
        {/* Type badge */}
        <span
          title={meta.tooltip}
          className="shrink-0 inline-flex items-center justify-center rounded-[4px] text-[9px] font-bold cursor-help"
          style={{
            width: 16,
            height: 16,
            background: meta.color,
            color: "#fff",
          }}
        >
          {meta.icon}
        </span>

        {/* Name */}
        <span className="text-[12px] font-medium truncate flex-1" style={{ color: "var(--fg)" }}>
          {concept.name}
        </span>

        {/* Plan count */}
        <span
          className="text-[10px] font-mono tabular-nums shrink-0"
          style={{ color: "var(--fg-tertiary)" }}
        >
          {planIds.length}
        </span>
      </button>

      {/* Expanded: show linked plans */}
      {isExpanded && (
        <div className="ml-6 mt-0.5 mb-1">
          {/* Context snippet */}
          {concept.context && concept.type !== "question" && (
            <p
              className="text-[10.5px] italic px-2 py-1 mb-1 rounded"
              style={{
                color: "var(--fg-tertiary)",
                background: "var(--bg)",
              }}
            >
              {concept.context.slice(0, 140)}
              {concept.context.length > 140 ? "..." : ""}
            </p>
          )}

          {/* Plan links */}
          <div className="space-y-px">
            {planIds.map((id, i) => (
              <PlanLink key={id} planId={id} planTitle={planTitles[i]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Plan link button ─────────────────────────────────────────────

function PlanLink({ planId, planTitle }: { planId: string; planTitle: string }) {
  const { attachCloud } = useEditorStore();
  const { fetchPlan, clearDocScopedState } = useCloudStore();

  async function openPlan() {
    // If it looks like a file path, open as file
    if (planId.startsWith("/") || planId.includes("\\")) {
      void openRecentFile(planId);
      return;
    }
    // Otherwise open as cloud plan
    const plan = await fetchPlan(planId);
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
    <button
      onClick={() => void openPlan()}
      className="w-full text-left px-2 py-[3px] rounded-[6px] flex items-center gap-1.5 transition-colors"
      style={{ color: "var(--fg-secondary)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)", flexShrink: 0 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
      <span className="text-[11px] truncate">{planTitle || "Untitled"}</span>
    </button>
  );
}
