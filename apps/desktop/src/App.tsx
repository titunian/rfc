import { useEffect, useCallback, useState } from "react";
import { Editor } from "./components/editor/Editor";
import { EditorActions } from "./components/editor/EditorActions";
import { Sidebar } from "./components/sidebar/Sidebar";
import { StatusBar } from "./components/status-bar/StatusBar";
import { CommandPalette } from "./components/command-palette/CommandPalette";
import { AuthModal } from "./components/auth-modal/AuthModal";
import { PublishDialog } from "./components/publish-dialog/PublishDialog";
import { SettingsDialog } from "./components/settings-dialog/SettingsDialog";
import { CommentsDrawer } from "./components/right-panel/CommentsDrawer";
import { VersionHistoryDrawer } from "./components/right-panel/VersionHistoryDrawer";
import { WelcomeScreen } from "./components/welcome/WelcomeScreen";
import { ConceptsList } from "./components/concepts/ConceptsList";
import { useEditorStore } from "./stores/editor-store";
import { useAppStore } from "./stores/app-store";
import { useAuthStore } from "./stores/auth-store";
import { useCloudStore } from "./stores/cloud-store";
import { useConceptsStore } from "./stores/concepts-store";
import { loadPersistedIndex } from "./stores/search-store";
import {
  openFileFromDisk,
  openRecentFile,
  saveFileToDisk,
  saveFileAs,
  createNewFile,
} from "./lib/file-ops";

export function App() {
  console.info("[orfc] App() rendering");
  const { content, setContent, planId, filePath } = useEditorStore();
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
    openSettings,
    toggleRightPanel,
    closeRightPanel,
    toggleToc,
    conceptsVisible,
    toggleConcepts,
  } = useAppStore();
  const { hydrate, status } = useAuthStore();

  // Hydrate auth + search index on boot.
  useEffect(() => {
    void hydrate();
    void loadPersistedIndex();
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

  // Welcome mode: signed out + no document open → hide sidebar, show onboarding
  const isWelcome = status !== "signed-in" && !planId && !filePath && !content.trim();

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

      // ⌘N — new document (creates file on disk)
      if (mod && !e.shiftKey && e.key === "n") {
        e.preventDefault();
        void createNewFile();
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

      // ⌘⇧T — toggle table of contents
      if (mod && e.shiftKey && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        toggleToc();
        return;
      }

      // ⌘⇧G — toggle concepts panel
      if (mod && e.shiftKey && (e.key === "g" || e.key === "G")) {
        e.preventDefault();
        toggleConcepts();
        return;
      }

      // ⌘⇧H — version history drawer
      if (mod && e.shiftKey && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        if (planId) toggleRightPanel("history");
        return;
      }

      // ⌘, — document settings
      if (mod && e.key === ",") {
        e.preventDefault();
        if (planId) openSettings();
        return;
      }

      // ⌘⇧R — pull latest from cloud
      if (mod && e.shiftKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        if (planId) void useCloudStore.getState().pullLatest(planId);
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
      toggleSidebar,
      toggleFocusMode,
      toggleTheme,
      focusMode,
      commandPaletteOpen,
      requestPublish,
      openSettings,
      toggleRightPanel,
      toggleToc,
      toggleConcepts,
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

  // Extract concepts when a cloud plan is loaded
  useEffect(() => {
    if (!planId) return;
    const { content: c, fileName } = useEditorStore.getState();
    if (c.trim()) {
      useConceptsStore.getState().extractAndIndex(planId, fileName || "Untitled", c);
    }
  }, [planId]);

  // Batch-extract concepts from all cloud plans when the plans list loads
  const cloudPlans = useCloudStore((s) => s.plans);
  useEffect(() => {
    if (!cloudPlans.length) return;
    const { fetchPlan } = useCloudStore.getState();
    void (async () => {
      for (const p of cloudPlans) {
        try {
          const plan = await fetchPlan(p.id);
          if (plan?.content) {
            useConceptsStore.getState().extractAndIndex(p.id, plan.title || "Untitled", plan.content);
          }
        } catch {
          // skip failures silently
        }
      }
    })();
  }, [cloudPlans]);

  // Periodic cloud update check (every 30s) when a cloud doc is open
  useEffect(() => {
    if (!planId) return;
    const check = async () => {
      const { hasUpdate } = await useCloudStore.getState().checkForUpdates(planId);
      if (hasUpdate) {
        useEditorStore.getState().setCloudUpdateAvailable(true);
      }
    };
    // Check immediately, then every 30s
    void check();
    const interval = setInterval(() => void check(), 30_000);
    return () => clearInterval(interval);
  }, [planId]);

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
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          gap: 6,
          padding: "6px",
        }}
      >
        {/* Sidebar — floating card */}
        {sidebarOpen && !focusMode && !isWelcome && <Sidebar />}

        {/* Main column — floating editor card */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            minHeight: 0,
            position: "relative",
            background: "var(--bg)",
            borderRadius: "var(--panel-radius)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {/* Sidebar-toggle fallback when sidebar is hidden */}
          {!sidebarOpen && !focusMode && !isWelcome && (
            <button
              onClick={() => useAppStore.getState().toggleSidebar()}
              className="absolute flex items-center justify-center rounded-[10px] transition-colors z-30"
              style={{
                top: 8,
                left: 12,
                width: 28,
                height: 28,
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
            {/* Welcome screen when signed out + no document open */}
            {isWelcome ? (
              <WelcomeScreen />
            ) : (
              <>
                {!focusMode && <EditorActions />}
                <VersionPreviewBanner />
                <Editor content={content} onChange={setContent} />
              </>
            )}
          </main>
        </div>

        {/* Right panel — inline floating card on wide windows */}
        {rightPanel !== "none" && !focusMode && !drawerIsOverlay && (
          <>
            {rightPanel === "comments" && <CommentsDrawer />}
            {rightPanel === "history" && <VersionHistoryDrawer />}
          </>
        )}

        {/* Concepts panel */}
        {conceptsVisible && !focusMode && <ConceptsList />}
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
      <SettingsDialog />
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
