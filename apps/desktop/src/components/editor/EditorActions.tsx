import { useState, useRef, useEffect, useCallback } from "react";
import { useAuthStore } from "../../stores/auth-store";
import { useAppStore } from "../../stores/app-store";
import { useEditorStore } from "../../stores/editor-store";
import { useCloudStore } from "../../stores/cloud-store";
import { useConceptsStore } from "../../stores/concepts-store";
import { analyzeWithClaude } from "../../lib/ai-analyze";
import { loadOrfcConfig } from "../../lib/orfc-config";
import { AIConfigModal } from "../ai-config/AIConfigModal";

// ── Plan status helpers ──────────────────────────────────────────

const PLAN_STATUSES = ["draft", "review", "approved", "executing", "done"] as const;
type PlanStatus = (typeof PLAN_STATUSES)[number];

const STATUS_META: Record<PlanStatus, { label: string; color: string; bg: string; icon?: string }> = {
  draft:     { label: "Draft",     color: "var(--fg-tertiary)", bg: "color-mix(in srgb, var(--fg-tertiary) 12%, transparent)" },
  review:    { label: "Review",    color: "#d97706",            bg: "color-mix(in srgb, #d97706 12%, transparent)" },
  approved:  { label: "Approved",  color: "var(--success)",     bg: "color-mix(in srgb, var(--success) 12%, transparent)" },
  executing: { label: "Executing", color: "#3b82f6",            bg: "color-mix(in srgb, #3b82f6 12%, transparent)" },
  done:      { label: "Done",      color: "var(--success)",     bg: "color-mix(in srgb, var(--success) 12%, transparent)", icon: "check" },
};

/**
 * Floating top-right rail of actions contextual to the current document.
 * Sits above the editor content so panel triggers are adjacent to where
 * the panels themselves open.
 */
export function EditorActions() {
  const {
    rightPanel,
    toggleRightPanel,
    toggleFocusMode,
    openPublishDialog,
    openAuthModal,
    openSettings,
    aiAnalyzing,
    setAiAnalyzing,
    setAiSummary,
    aiConfigModalOpen,
    openAiConfigModal,
    closeAiConfigModal,
    toggleConcepts,
  } = useAppStore();
  const planId = useEditorStore((s) => s.planId);
  const planUrl = useEditorStore((s) => s.planUrl);
  const isDirty = useEditorStore((s) => s.isDirty);
  const syncState = useEditorStore((s) => s.syncState);
  const planStatus = useEditorStore((s) => s.planStatus);
  const content = useEditorStore((s) => s.content);
  const fileName = useEditorStore((s) => s.fileName);
  const hasContent = content.trim().length > 0;
  const cloudUpdateAvailable = useEditorStore((s) => s.cloudUpdateAvailable);
  const comments = useCloudStore((s) => s.comments);
  const pullLatest = useCloudStore((s) => s.pullLatest);
  const updateStatus = useCloudStore((s) => s.updateStatus);
  const mergeAIConcepts = useConceptsStore((s) => s.mergeAIConcepts);
  const { status } = useAuthStore();

  const unresolvedCount = comments.filter((c) => !c.resolved).length;

  // ── AI Analysis ────────────────────────────────────────────────
  const runAnalysis = useCallback(async (apiKey: string) => {
    if (aiAnalyzing || !content.trim()) return;
    setAiAnalyzing(true);
    closeAiConfigModal();
    try {
      const result = await analyzeWithClaude(content, apiKey);
      if (result.summary) {
        setAiSummary(result.summary);
        // Auto-dismiss after 5 seconds
        setTimeout(() => setAiSummary(null), 5000);
      }
      if (result.concepts.length > 0) {
        const id = planId || "local";
        const title = fileName || "Untitled";
        mergeAIConcepts(id, title, result);
        // Open concepts panel to show enriched results
        const appState = useAppStore.getState();
        if (!appState.conceptsVisible) toggleConcepts();
      }
    } catch (err) {
      console.error("[ai-analyze] unexpected error:", err);
    } finally {
      setAiAnalyzing(false);
    }
  }, [aiAnalyzing, content, planId, fileName, setAiAnalyzing, setAiSummary, closeAiConfigModal, mergeAIConcepts, toggleConcepts]);

  const handleAiAnalyze = useCallback(async () => {
    if (aiAnalyzing) return;
    try {
      const config = await loadOrfcConfig();
      if (config.anthropicApiKey) {
        await runAnalysis(config.anthropicApiKey);
      } else {
        openAiConfigModal();
      }
    } catch {
      openAiConfigModal();
    }
  }, [aiAnalyzing, runAnalysis, openAiConfigModal]);

  // Keyboard shortcut: Cmd+Shift+A
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        void handleAiAnalyze();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleAiAnalyze]);

  // Command palette event
  useEffect(() => {
    const handler = () => void handleAiAnalyze();
    window.addEventListener("orfc:ai-analyze", handler);
    return () => window.removeEventListener("orfc:ai-analyze", handler);
  }, [handleAiAnalyze]);
  // Show Publish only when there's something worth publishing:
  // - cloud-synced doc with local changes (dirty), OR
  // - a non-empty draft that's never been pushed to the cloud
  const showPublish = hasContent && (syncState === "dirty" || !planId);

  const requestPublish = () => {
    if (status !== "signed-in") openAuthModal();
    else openPublishDialog();
  };

  const aiSummary = useAppStore((s) => s.aiSummary);

  return (
    <>
    <div
      className="sticky top-0 z-20 flex items-center justify-end gap-0.5 px-4 py-2"
      style={{
        background:
          "linear-gradient(to bottom, var(--bg) 0%, var(--bg) 70%, transparent 100%)",
        pointerEvents: "none",
      }}
    >
      {/* AI Summary toast */}
      {aiSummary && (
        <div
          className="absolute left-4 top-2 max-w-[50%] px-3 py-2 rounded-lg text-[12px] anim-fade-scale"
          style={{
            background: "color-mix(in srgb, var(--accent) 10%, var(--bg-elevated))",
            border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
            color: "var(--fg-secondary)",
            pointerEvents: "auto",
          }}
        >
          <span className="font-medium" style={{ color: "var(--accent)" }}>AI Summary: </span>
          {aiSummary}
        </div>
      )}
      <div className="flex items-center gap-0.5" style={{ pointerEvents: "auto" }}>
        {/* Update available: cloud moved ahead */}
        {cloudUpdateAvailable && planId && (
          <>
            <button
              onClick={() => void pullLatest(planId)}
              className="flex items-center gap-1.5 text-[11.5px] font-medium h-7 px-2.5 rounded-lg transition-all anim-fade-scale"
              style={{
                color: "var(--success)",
                background: "color-mix(in srgb, var(--success) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--success) 35%, transparent)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--success)";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "color-mix(in srgb, var(--success) 12%, transparent)";
                e.currentTarget.style.color = "var(--success)";
              }}
              title="Pull latest from cloud · ⌘⇧R"
            >
              <span className="anim-pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", flexShrink: 0 }} />
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Update available
            </button>
            <span className="w-[1px] h-4 mx-1" style={{ background: "var(--border-subtle)" }} />
          </>
        )}

        {/* Publish: only when out of sync */}
        {showPublish && (
          <>
            <button
              onClick={requestPublish}
              className="flex items-center gap-1.5 text-[11.5px] font-medium h-7 px-2.5 rounded-lg transition-all anim-fade-scale"
              style={{
                color: "var(--accent)",
                background: "var(--accent-soft)",
                border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent)";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--accent-soft)";
                e.currentTarget.style.color = "var(--accent)";
              }}
              title={planId ? "Publish update · ⌘P" : "Publish to orfc.dev · ⌘P"}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {planId && isDirty ? "Publish changes" : "Publish"}
            </button>
            <span className="w-[1px] h-4 mx-1" style={{ background: "var(--border-subtle)" }} />
          </>
        )}

        {/* Plan status badge */}
        {planId && planStatus && (
          <>
            <StatusBadge
              status={planStatus}
              onChangeStatus={(s) => void updateStatus(planId, s)}
            />
            <span className="w-[1px] h-4 mx-1" style={{ background: "var(--border-subtle)" }} />
          </>
        )}

        {/* Focus mode */}
        <IconButton
          onClick={() => toggleFocusMode()}
          title="Focus mode · ⌘⇧F"
          active={false}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          </svg>
        </IconButton>

        {/* Comments: only when cloud-synced */}
        {planId && (
          <IconButton
            onClick={() => toggleRightPanel("comments")}
            title="Comments · ⌘⇧C"
            active={rightPanel === "comments"}
            badge={unresolvedCount}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </IconButton>
        )}

        {/* Version history: only when cloud-synced */}
        {planId && (
          <IconButton
            onClick={() => toggleRightPanel("history")}
            title="Version history · ⌘⇧H"
            active={rightPanel === "history"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </IconButton>
        )}

        {/* Settings: only when cloud-synced */}
        {planId && (
          <IconButton
            onClick={() => openSettings()}
            title="Document settings · ⌘,"
            active={false}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </IconButton>
        )}

        {/* AI Deep Analyze */}
        {hasContent && (
          <IconButton
            onClick={() => void handleAiAnalyze()}
            title="Deep Analyze with AI · ⌘⇧A"
            active={false}
          >
            {aiAnalyzing ? (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="anim-spin"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                <path d="M5 3v4" />
                <path d="M19 17v4" />
                <path d="M3 5h4" />
                <path d="M17 19h4" />
              </svg>
            )}
          </IconButton>
        )}

        {/* Open in browser: only if published */}
        {planUrl && (
          <IconButton
            onClick={async () => {
              try {
                const { open } = await import("@tauri-apps/plugin-shell");
                await open(planUrl);
              } catch {
                /* ignore */
              }
            }}
            title="Open on orfc.dev"
            active={false}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </IconButton>
        )}
      </div>
    </div>
    <AIConfigModal
      open={aiConfigModalOpen}
      onClose={closeAiConfigModal}
      onSaveAndAnalyze={(key) => void runAnalysis(key)}
    />
    </>
  );
}

function StatusBadge({
  status,
  onChangeStatus,
}: {
  status: string;
  onChangeStatus: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const key = (PLAN_STATUSES.includes(status as PlanStatus) ? status : "draft") as PlanStatus;
  const meta = STATUS_META[key];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] font-medium h-7 px-2 rounded-lg transition-all"
        style={{
          color: meta.color,
          background: meta.bg,
          border: `1px solid color-mix(in srgb, ${meta.color} 30%, transparent)`,
        }}
        title="Change plan status"
      >
        <span
          className={key === "executing" ? "anim-pulse-dot" : ""}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: meta.color,
            flexShrink: 0,
          }}
        />
        {meta.icon === "check" && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {meta.label}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 py-1 rounded-lg overflow-hidden anim-fade-scale"
          style={{
            minWidth: 140,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-lg)",
            zIndex: 50,
          }}
        >
          {PLAN_STATUSES.map((s) => {
            const m = STATUS_META[s];
            const active = s === key;
            return (
              <button
                key={s}
                onClick={() => {
                  onChangeStatus(s);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors"
                style={{
                  color: active ? m.color : "var(--fg-secondary)",
                  background: active ? m.bg : "transparent",
                  fontWeight: active ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: m.color,
                    flexShrink: 0,
                  }}
                />
                {m.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IconButton({
  onClick,
  title,
  active,
  badge,
  children,
}: {
  onClick: () => void;
  title: string;
  active: boolean;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center rounded-[10px] transition-colors"
      style={{
        width: 28,
        height: 28,
        color: active ? "var(--fg)" : "var(--fg-tertiary)",
        background: active ? "var(--bg-active)" : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "var(--bg-hover)";
          e.currentTarget.style.color = "var(--fg)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--fg-tertiary)";
        }
      }}
      title={title}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[14px] h-[14px] text-[9px] font-bold rounded-full px-1"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}
