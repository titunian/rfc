import { useAuthStore } from "../../stores/auth-store";
import { useAppStore } from "../../stores/app-store";
import { useEditorStore } from "../../stores/editor-store";
import { useCloudStore } from "../../stores/cloud-store";

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
  } = useAppStore();
  const planId = useEditorStore((s) => s.planId);
  const planUrl = useEditorStore((s) => s.planUrl);
  const isDirty = useEditorStore((s) => s.isDirty);
  const syncState = useEditorStore((s) => s.syncState);
  const hasContent = useEditorStore((s) => s.content.trim().length > 0);
  const cloudUpdateAvailable = useEditorStore((s) => s.cloudUpdateAvailable);
  const comments = useCloudStore((s) => s.comments);
  const pullLatest = useCloudStore((s) => s.pullLatest);
  const { status } = useAuthStore();

  const unresolvedCount = comments.filter((c) => !c.resolved).length;
  // Show Publish only when there's something worth publishing:
  // - cloud-synced doc with local changes (dirty), OR
  // - a non-empty draft that's never been pushed to the cloud
  const showPublish = hasContent && (syncState === "dirty" || !planId);

  const requestPublish = () => {
    if (status !== "signed-in") openAuthModal();
    else openPublishDialog();
  };

  return (
    <div
      className="sticky top-0 z-20 flex items-center justify-end gap-0.5 px-4 py-2"
      style={{
        background:
          "linear-gradient(to bottom, var(--bg) 0%, var(--bg) 70%, transparent 100%)",
        pointerEvents: "none",
      }}
    >
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
