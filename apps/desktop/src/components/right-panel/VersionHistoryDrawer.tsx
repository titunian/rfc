import { useEffect, useState } from "react";
import { useCloudStore } from "../../stores/cloud-store";
import { useEditorStore } from "../../stores/editor-store";
import { useAuthStore } from "../../stores/auth-store";
import { useAppStore } from "../../stores/app-store";

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

  useEffect(() => {
    if (planId) void fetchVersions(planId);
  }, [planId, fetchVersions]);

  async function selectVersion(versionId: string) {
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

  function backToCurrent() {
    setPreviewVersion(null);
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

  return (
    <Panel>
      <PanelHeader
        title="Version history"
        subtitle={currentVersion ? `Current: v${currentVersion}` : undefined}
        onClose={closeRightPanel}
      />

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
              background: !previewVersion ? "var(--accent-soft)" : "transparent",
              borderLeftColor: !previewVersion ? "var(--accent)" : "transparent",
            }}
            onMouseEnter={(e) => {
              if (previewVersion)
                e.currentTarget.style.background = "var(--bg-hover)";
            }}
            onMouseLeave={(e) => {
              if (previewVersion) e.currentTarget.style.background = "transparent";
            }}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="inline-flex items-center justify-center font-mono rounded px-1.5 py-0.5 leading-none text-[10px] font-bold"
                style={{
                  background: !previewVersion ? "var(--accent)" : "var(--success)",
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
              {!previewVersion && (
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
          const active = v.id === previewVersion?.versionId;
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
                    viewing
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
      </div>

      {/* Footer hint */}
      <div
        className="px-3 py-2 text-[10.5px] text-center"
        style={{
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-sidebar)",
          color: "var(--fg-tertiary)",
        }}
      >
        Click any version to preview · Restore from the banner
      </div>
    </Panel>
  );
}

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
