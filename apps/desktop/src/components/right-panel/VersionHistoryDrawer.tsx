import { useEffect, useState } from "react";
import { useCloudStore } from "../../stores/cloud-store";
import { useEditorStore } from "../../stores/editor-store";
import { useAuthStore } from "../../stores/auth-store";
import { useAppStore } from "../../stores/app-store";
import type { DiffLine } from "@orfc/api";

function relativeTime(iso: string) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const secs = Math.max(0, Math.floor((now - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

type ViewMode = "diff" | "preview";

export function VersionHistoryDrawer() {
  const { closeRightPanel } = useAppStore();
  const { planId, previewVersion, setPreviewVersion } = useEditorStore();
  const {
    versions,
    versionsLoading,
    versionsError,
    currentVersion,
    fetchVersions,
  } = useCloudStore();

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("diff");
  const [diff, setDiff] = useState<DiffLine[] | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  useEffect(() => {
    if (planId) void fetchVersions(planId);
  }, [planId, fetchVersions]);

  async function fetchDiff(versionId: string) {
    if (!planId) return;
    setDiffLoading(true);
    setDiffError(null);
    setDiff(null);
    try {
      const client = useAuthStore.getState().client;
      if (!client) return;
      const result = await client.getDiff(planId, versionId, "current");
      setDiff(result.diff);
    } catch (e) {
      console.error("getDiff failed", e);
      setDiffError(e instanceof Error ? e.message : "Failed to load diff");
    } finally {
      setDiffLoading(false);
    }
  }

  async function selectVersion(versionId: string) {
    setSelectedVersionId(versionId);

    if (viewMode === "diff") {
      await fetchDiff(versionId);
    } else {
      // Preview mode — load content into editor
      if (!planId) return;
      setLoadingId(versionId);
      try {
        const client = useAuthStore.getState().client;
        if (!client) return;
        const detail = await client.getVersion(planId, versionId);
        setPreviewVersion({
          versionId: detail.id,
          version: detail.version,
          title: detail.title,
          content: detail.content,
          authorEmail: detail.authorEmail,
          createdAt: detail.createdAt,
        });
      } catch (e) {
        console.error("getVersion failed", e);
      } finally {
        setLoadingId(null);
      }
    }
  }

  async function switchViewMode(mode: ViewMode) {
    setViewMode(mode);
    if (!selectedVersionId || !planId) return;

    if (mode === "diff") {
      // Clear preview, load diff
      setPreviewVersion(null);
      await fetchDiff(selectedVersionId);
    } else {
      // Clear diff, load preview
      setDiff(null);
      setDiffError(null);
      setLoadingId(selectedVersionId);
      try {
        const client = useAuthStore.getState().client;
        if (!client) return;
        const detail = await client.getVersion(planId, selectedVersionId);
        setPreviewVersion({
          versionId: detail.id,
          version: detail.version,
          title: detail.title,
          content: detail.content,
          authorEmail: detail.authorEmail,
          createdAt: detail.createdAt,
        });
      } catch (e) {
        console.error("getVersion failed", e);
      } finally {
        setLoadingId(null);
      }
    }
  }

  function backToCurrent() {
    setPreviewVersion(null);
    setSelectedVersionId(null);
    setDiff(null);
    setDiffError(null);
  }

  if (!planId) {
    return (
      <Panel>
        <PanelHeader title="History" onClose={closeRightPanel} />
        <EmptyState
          title="Not published"
          body="Publish this draft (⌘P) to start tracking version history."
        />
      </Panel>
    );
  }

  const activeVersionId = viewMode === "preview" ? previewVersion?.versionId : selectedVersionId;

  return (
    <Panel>
      <PanelHeader
        title="Version history"
        subtitle={currentVersion ? `Current: v${currentVersion}` : undefined}
        onClose={closeRightPanel}
      />

      {/* Tab toggle */}
      <div
        className="flex shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <button
          onClick={() => switchViewMode("diff")}
          className="flex-1 text-[11.5px] font-medium py-2 transition-colors"
          style={{
            color: viewMode === "diff" ? "var(--fg)" : "var(--muted)",
            borderBottom: viewMode === "diff" ? "2px solid var(--accent)" : "2px solid transparent",
          }}
          onMouseEnter={(e) => {
            if (viewMode !== "diff") e.currentTarget.style.color = "var(--fg-secondary)";
          }}
          onMouseLeave={(e) => {
            if (viewMode !== "diff") e.currentTarget.style.color = "var(--muted)";
          }}
        >
          Diff
        </button>
        <button
          onClick={() => switchViewMode("preview")}
          className="flex-1 text-[11.5px] font-medium py-2 transition-colors"
          style={{
            color: viewMode === "preview" ? "var(--fg)" : "var(--muted)",
            borderBottom: viewMode === "preview" ? "2px solid var(--accent)" : "2px solid transparent",
          }}
          onMouseEnter={(e) => {
            if (viewMode !== "preview") e.currentTarget.style.color = "var(--fg-secondary)";
          }}
          onMouseLeave={(e) => {
            if (viewMode !== "preview") e.currentTarget.style.color = "var(--muted)";
          }}
        >
          Preview
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {versionsLoading && versions.length === 0 && (
          <p
            className="text-[12px] text-center py-6"
            style={{ color: "var(--fg-tertiary)" }}
          >
            Loading versions…
          </p>
        )}

        {versionsError && (
          <p
            className="text-[12px] px-3 py-2 mx-3 mt-2 rounded"
            style={{
              background: "var(--danger-soft)",
              border: "1px solid var(--danger-border)",
              color: "var(--danger)",
            }}
          >
            {versionsError}
          </p>
        )}

        {!versionsLoading && versions.length === 0 && !versionsError && (
          <EmptyState
            title="No versions yet"
            body="Versions are created each time you publish an update (⌘P)."
          />
        )}

        {/* Current version row — clicking it clears any preview */}
        {currentVersion && (
          <button
            onClick={backToCurrent}
            className="w-full text-left px-4 py-2.5 transition-colors relative border-l-2"
            style={{
              background: !activeVersionId ? "var(--accent-soft)" : "transparent",
              borderLeftColor: !activeVersionId ? "var(--accent)" : "transparent",
            }}
            onMouseEnter={(e) => {
              if (activeVersionId)
                e.currentTarget.style.background = "var(--bg-hover)";
            }}
            onMouseLeave={(e) => {
              if (activeVersionId) e.currentTarget.style.background = "transparent";
            }}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="inline-flex items-center justify-center font-mono rounded px-1.5 py-0.5 leading-none text-[10px] font-bold"
                style={{
                  background: !activeVersionId ? "var(--accent)" : "var(--success)",
                  color: "#fff",
                }}
              >
                v{currentVersion}
              </span>
              <span
                className="text-[12px] font-semibold"
                style={{ color: "var(--fg)" }}
              >
                Current
              </span>
              {!activeVersionId && (
                <span
                  className="text-[9.5px] font-semibold uppercase tracking-wider ml-auto"
                  style={{ color: "var(--accent)" }}
                >
                  viewing
                </span>
              )}
            </div>
            <div
              className="text-[10.5px] font-mono"
              style={{ color: "var(--fg-tertiary)" }}
            >
              Live working copy
            </div>
          </button>
        )}

        {versions.map((v) => {
          const active = v.id === activeVersionId;
          const loading = loadingId === v.id;
          return (
            <button
              key={v.id}
              onClick={() => selectVersion(v.id)}
              className="w-full text-left px-4 py-2.5 transition-colors relative border-l-2"
              style={{
                background: active ? "var(--accent-soft)" : "transparent",
                borderLeftColor: active ? "var(--accent)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!active)
                  e.currentTarget.style.background = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="inline-flex items-center justify-center font-mono rounded px-1.5 py-0.5 leading-none text-[10px] font-bold"
                  style={{
                    background: active ? "var(--accent)" : "var(--bg-sidebar)",
                    color: active ? "#fff" : "var(--fg-secondary)",
                    border: active ? "none" : "1px solid var(--border-subtle)",
                  }}
                >
                  v{v.version}
                </span>
                {v.title && (
                  <span
                    className="text-[12px] font-medium truncate"
                    style={{ color: active ? "var(--fg)" : "var(--fg-secondary)" }}
                  >
                    {v.title}
                  </span>
                )}
                {loading && (
                  <span
                    className="inline-block w-3 h-3 rounded-full animate-spin"
                    style={{
                      border: "1.4px solid var(--border)",
                      borderTopColor: "var(--fg-secondary)",
                    }}
                  />
                )}
                {active && !loading && (
                  <span
                    className="text-[9.5px] font-semibold uppercase tracking-wider ml-auto"
                    style={{ color: "var(--accent)" }}
                  >
                    {viewMode === "diff" ? "diff" : "viewing"}
                  </span>
                )}
              </div>
              <div
                className="flex items-center gap-1.5 text-[10.5px] font-mono"
                style={{ color: "var(--fg-tertiary)" }}
              >
                <span title={new Date(v.createdAt).toLocaleString()}>
                  {relativeTime(v.createdAt)}
                </span>
                {v.authorEmail && (
                  <>
                    <span style={{ color: "var(--muted)" }}>·</span>
                    <span className="truncate">{v.authorEmail}</span>
                  </>
                )}
              </div>
            </button>
          );
        })}

        {/* Inline diff view (only in diff mode when a version is selected) */}
        {viewMode === "diff" && selectedVersionId && (
          <div
            style={{ borderTop: "1px solid var(--border-subtle)" }}
          >
            {diffLoading && (
              <p
                className="text-[11px] text-center py-4"
                style={{ color: "var(--fg-tertiary)" }}
              >
                Loading diff…
              </p>
            )}

            {diffError && (
              <p
                className="text-[11px] px-3 py-2 mx-3 mt-2 rounded"
                style={{
                  background: "var(--danger-soft)",
                  border: "1px solid var(--danger-border)",
                  color: "var(--danger)",
                }}
              >
                {diffError}
              </p>
            )}

            {diff && diff.length === 0 && (
              <p
                className="text-[11px] text-center py-4"
                style={{ color: "var(--fg-tertiary)" }}
              >
                No changes
              </p>
            )}

            {diff && diff.length > 0 && (
              <DiffView lines={diff} />
            )}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div
        className="px-3 py-2 text-[10.5px] text-center shrink-0"
        style={{
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-sidebar)",
          color: "var(--fg-tertiary)",
        }}
      >
        {viewMode === "diff"
          ? "Click any version to see what changed"
          : "Click any version to preview · Restore from the banner"}
      </div>
    </Panel>
  );
}

/* ── Diff View ── */

function DiffView({ lines }: { lines: DiffLine[] }) {
  let addLine = 0;
  let removeLine = 0;

  const numbered = lines.map((line) => {
    let left: number | null = null;
    let right: number | null = null;
    if (line.type === "same") {
      removeLine++;
      addLine++;
      left = removeLine;
      right = addLine;
    } else if (line.type === "remove") {
      removeLine++;
      left = removeLine;
    } else {
      addLine++;
      right = addLine;
    }
    return { ...line, left, right };
  });

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full font-mono text-[11px] leading-[18px]"
        style={{ borderCollapse: "collapse" }}
      >
        <tbody>
          {numbered.map((line, i) => {
            const bgColor =
              line.type === "add"
                ? "var(--diff-add-bg)"
                : line.type === "remove"
                ? "var(--diff-remove-bg)"
                : "transparent";
            const textColor =
              line.type === "add"
                ? "var(--diff-add-text)"
                : line.type === "remove"
                ? "var(--diff-remove-text)"
                : "var(--fg-tertiary)";
            const prefix =
              line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";

            return (
              <tr key={i} style={{ background: bgColor }}>
                <td
                  className="text-right select-none px-1.5 shrink-0"
                  style={{
                    background: "var(--gutter-bg)",
                    color: "var(--gutter-text)",
                    width: 28,
                    minWidth: 28,
                    fontSize: 10,
                    verticalAlign: "top",
                    userSelect: "none",
                  }}
                >
                  {line.left ?? ""}
                </td>
                <td
                  className="text-right select-none px-1.5 shrink-0"
                  style={{
                    background: "var(--gutter-bg)",
                    color: "var(--gutter-text)",
                    width: 28,
                    minWidth: 28,
                    fontSize: 10,
                    verticalAlign: "top",
                    userSelect: "none",
                    borderRight: "1px solid var(--border-subtle)",
                  }}
                >
                  {line.right ?? ""}
                </td>
                <td
                  className="whitespace-pre-wrap break-all pl-1 pr-2"
                  style={{ color: textColor }}
                >
                  <span className="select-none" style={{ opacity: 0.5 }}>
                    {prefix}
                  </span>
                  {line.content}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Shared layout components ── */

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <aside
      className="h-full flex flex-col shrink-0"
      style={{
        width: 300,
        background: "var(--bg-sidebar)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--panel-radius)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
      }}
    >
      <div data-tauri-drag-region style={{ height: 12, flexShrink: 0 }} />
      {children}
    </aside>
  );
}

function PanelHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div className="flex flex-col min-w-0">
        <h3
          className="text-[12.5px] font-semibold tracking-tight"
          style={{ color: "var(--fg)" }}
        >
          {title}
        </h3>
        {subtitle && (
          <span
            className="text-[10.5px] truncate font-mono"
            style={{ color: "var(--fg-tertiary)" }}
          >
            {subtitle}
          </span>
        )}
      </div>
      <button
        onClick={onClose}
        className="w-6 h-6 flex items-center justify-center rounded transition-colors"
        style={{ color: "var(--fg-tertiary)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-hover)";
          e.currentTarget.style.color = "var(--fg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--fg-tertiary)";
        }}
        title="Close"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10">
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center mb-3"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--muted)" }}
        >
          <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
      </div>
      <p className="text-[12.5px] font-medium" style={{ color: "var(--fg)" }}>
        {title}
      </p>
      <p
        className="text-[11.5px] leading-relaxed mt-1 max-w-[240px]"
        style={{ color: "var(--fg-tertiary)" }}
      >
        {body}
      </p>
    </div>
  );
}
