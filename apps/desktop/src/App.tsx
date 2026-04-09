import { useEffect, useCallback, useState } from "react";
import { Editor } from "./components/editor/Editor";
import { EditorActions } from "./components/editor/EditorActions";
import { Sidebar } from "./components/sidebar/Sidebar";
import { StatusBar } from "./components/status-bar/StatusBar";
import { CommandPalette } from "./components/command-palette/CommandPalette";
import { AuthModal } from "./components/auth-modal/AuthModal";
import { PublishDialog } from "./components/publish-dialog/PublishDialog";
import { CommentsDrawer } from "./components/right-panel/CommentsDrawer";
import { VersionHistoryDrawer } from "./components/right-panel/VersionHistoryDrawer";
import { useEditorStore } from "./stores/editor-store";
import { useAppStore } from "./stores/app-store";
import { useAuthStore } from "./stores/auth-store";
import {
  openFileFromDisk,
  openRecentFile,
  saveFileToDisk,
  saveFileAs,
} from "./lib/file-ops";

export function App() {
  console.info("[orfc] App() rendering");
  const { content, setContent, newFile, planId } = useEditorStore();
  const {
    sidebarOpen,
    focusMode,
    commandPaletteOpen,
    rightPanel,
    toggleSidebar,
    toggleFocusMode,
    toggleCommandPalette,
    closeCommandPalette,
    toggleTheme,
    openAuthModal,
    openPublishDialog,
    toggleRightPanel,
    closeRightPanel,
  } = useAppStore();
  const { hydrate, status } = useAuthStore();

  // Hydrate auth on boot.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Track window width so the right drawer can switch to overlay mode on narrow windows.
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const drawerIsOverlay = viewportWidth < 1200;

  const requestPublish = useCallback(() => {
    if (status !== "signed-in") {
      openAuthModal();
    } else {
      openPublishDialog();
    }
  }, [status, openAuthModal, openPublishDialog]);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // ⌘K — command palette
      if (mod && e.key === "k") {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // ⌘N — new document
      if (mod && !e.shiftKey && e.key === "n") {
        e.preventDefault();
        newFile();
        return;
      }

      // ⌘O — open
      if (mod && e.key === "o") {
        e.preventDefault();
        void openFileFromDisk();
        return;
      }

      // ⌘S / ⌘⇧S — save / save as
      if (mod && e.key === "s") {
        e.preventDefault();
        if (e.shiftKey) void saveFileAs();
        else void saveFileToDisk();
        return;
      }

      // ⌘P — publish
      if (mod && !e.shiftKey && e.key === "p") {
        e.preventDefault();
        requestPublish();
        return;
      }

      // ⌘\ — toggle sidebar
      if (mod && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // ⌘⇧F — toggle focus mode
      if (mod && e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        toggleFocusMode();
        return;
      }

      // ⌘⇧L — toggle theme
      if (mod && e.shiftKey && (e.key === "l" || e.key === "L")) {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // ⌘⇧C — comments drawer
      if (mod && e.shiftKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        if (planId) toggleRightPanel("comments");
        return;
      }

      // ⌘⇧H — version history drawer
      if (mod && e.shiftKey && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        if (planId) toggleRightPanel("history");
        return;
      }

      // ESC exits focus mode
      if (e.key === "Escape" && focusMode && !commandPaletteOpen) {
        e.preventDefault();
        toggleFocusMode();
        return;
      }
    },
    [
      toggleCommandPalette,
      newFile,
      toggleSidebar,
      toggleFocusMode,
      toggleTheme,
      focusMode,
      commandPaletteOpen,
      requestPublish,
      toggleRightPanel,
      planId,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Listen for custom events fired by the command palette so palette items can
  // invoke high-level actions without pulling in heavy store hooks.
  useEffect(() => {
    const onOpen = () => void openFileFromDisk();
    const onSave = () => void saveFileToDisk();
    const onPublish = () => requestPublish();
    window.addEventListener("orfc:open", onOpen);
    window.addEventListener("orfc:save", onSave);
    window.addEventListener("orfc:publish", onPublish);
    return () => {
      window.removeEventListener("orfc:open", onOpen);
      window.removeEventListener("orfc:save", onSave);
      window.removeEventListener("orfc:publish", onPublish);
    };
  }, [requestPublish]);

  // Listen for OS file-open events from Finder / "Open With → orfc" / dock drop.
  // The Rust side emits `orfc:open-files` with a string[] of absolute paths.
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    void (async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<string[]>("orfc:open-files", (e) => {
          const paths = Array.isArray(e.payload) ? e.payload : [];
          // Open the first path; future versions could open multiple in tabs.
          if (paths.length) void openRecentFile(paths[0]);
        });
      } catch (err) {
        console.warn("[orfc] could not register file-open listener:", err);
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Close command palette when entering focus mode
  useEffect(() => {
    if (focusMode) closeCommandPalette();
  }, [focusMode, closeCommandPalette]);

  return (
    <div
      className={focusMode ? "focus-mode" : ""}
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-shell)",
      }}
    >
      {/* Top drag spacer (also covers traffic lights — they sit at x:16 y:16) */}
      <div
        data-tauri-drag-region
        style={{
          height: 6,
          flexShrink: 0,
          background: "var(--bg-shell)",
        }}
      />

      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          gap: 6,
          padding: "0 6px 6px",
        }}
      >
        {/* Sidebar — floating card */}
        {sidebarOpen && !focusMode && <Sidebar />}

        {/* Main column — floating editor card */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            position: "relative",
            background: "var(--bg)",
            borderRadius: "var(--panel-radius)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}
        >
          {/* Drag region across the top of the editor card — clears macOS controls */}
          <div
            data-tauri-drag-region
            style={{
              height: 32,
              flexShrink: 0,
              background: "var(--bg)",
            }}
          />

          {/* Sidebar-toggle fallback when sidebar is hidden */}
          {!sidebarOpen && !focusMode && (
            <button
              onClick={() => useAppStore.getState().toggleSidebar()}
              className="absolute flex items-center justify-center rounded transition-colors z-30"
              style={{
                top: 6,
                left: 86,
                width: 24,
                height: 24,
                color: "var(--fg-tertiary)",
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-hover)";
                e.currentTarget.style.color = "var(--fg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--fg-tertiary)";
              }}
              title="Show sidebar · ⌘\"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </button>
          )}

          <main
            style={{
              flex: 1,
              overflowY: "auto",
              background: "var(--bg)",
              position: "relative",
            }}
          >
            {!focusMode && <EditorActions />}
            <VersionPreviewBanner />
            <Editor content={content} onChange={setContent} />
          </main>
        </div>

        {/* Right panel — inline floating card on wide windows */}
        {rightPanel !== "none" && !focusMode && !drawerIsOverlay && (
          <>
            {rightPanel === "comments" && <CommentsDrawer />}
            {rightPanel === "history" && <VersionHistoryDrawer />}
          </>
        )}
      </div>

      {/* Overlay drawer on narrow windows */}
      {rightPanel !== "none" && !focusMode && drawerIsOverlay && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          style={{ background: "var(--overlay)" }}
          onClick={closeRightPanel}
        >
          <div onClick={(e) => e.stopPropagation()} className="anim-slide-in">
            {rightPanel === "comments" && <CommentsDrawer />}
            {rightPanel === "history" && <VersionHistoryDrawer />}
          </div>
        </div>
      )}

      {!focusMode && <StatusBar />}

      {focusMode && <FocusModeIndicator content={content} />}

      <CommandPalette />
      <AuthModal />
      <PublishDialog />
    </div>
  );
}

function VersionPreviewBanner() {
  const previewVersion = useEditorStore((s) => s.previewVersion);
  const setPreviewVersion = useEditorStore((s) => s.setPreviewVersion);
  const restorePreviewVersion = useEditorStore((s) => s.restorePreviewVersion);

  if (!previewVersion) return null;

  return (
    <div
      className="sticky top-[44px] z-[15] mx-auto"
      style={{
        maxWidth: "var(--editor-width)",
        margin: "8px auto 0",
        padding: "0 32px",
      }}
    >
      <div
        className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg anim-slide-up"
        style={{
          background: "var(--accent-soft)",
          border: "1px solid var(--accent)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--accent)", flexShrink: 0 }}
        >
          <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
        <div className="flex-1 min-w-0">
          <div
            className="text-[12.5px] font-semibold"
            style={{ color: "var(--accent)" }}
          >
            Viewing version {previewVersion.version}
            {previewVersion.title && (
              <span style={{ color: "var(--fg-secondary)", fontWeight: 500 }}>
                {" — "}
                {previewVersion.title}
              </span>
            )}
          </div>
          <div
            className="text-[11px]"
            style={{ color: "var(--fg-tertiary)" }}
          >
            Read-only preview · {previewVersion.authorEmail || "unknown author"} ·{" "}
            {new Date(previewVersion.createdAt).toLocaleString()}
          </div>
        </div>
        <button
          onClick={restorePreviewVersion}
          className="text-[11.5px] font-medium px-2.5 py-1 rounded-md transition-colors"
          style={{
            background: "var(--bg)",
            color: "var(--fg-secondary)",
            border: "1px solid var(--border)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-hover)";
            e.currentTarget.style.color = "var(--fg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg)";
            e.currentTarget.style.color = "var(--fg-secondary)";
          }}
          title="Replace your current draft with this version"
        >
          Restore
        </button>
        <button
          onClick={() => setPreviewVersion(null)}
          className="text-[11.5px] font-medium px-2.5 py-1 rounded-md transition-colors"
          style={{
            background: "var(--accent)",
            color: "#fff",
          }}
        >
          Back to current
        </button>
      </div>
    </div>
  );
}

function FocusModeIndicator({ content }: { content: string }) {
  const { toggleFocusMode } = useAppStore();
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  return (
    <button
      onClick={toggleFocusMode}
      className="fixed bottom-6 right-6 flex items-center gap-2 px-3 py-1.5 rounded-full anim-slide-up"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-md)",
        color: "var(--fg-tertiary)",
        fontSize: 11,
        fontFeatureSettings: "'tnum'",
        zIndex: 50,
      }}
      title="Exit focus mode · ESC"
    >
      <span
        className="anim-pulse-dot"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--accent)",
        }}
      />
      <span>{words.toLocaleString()} words</span>
      <span style={{ color: "var(--muted)" }}>·</span>
      <span>ESC to exit</span>
    </button>
  );
}
