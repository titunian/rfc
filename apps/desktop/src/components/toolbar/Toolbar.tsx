import { useAppStore } from "../../stores/app-store";

/**
 * The toolbar is intentionally invisible-ish: it exists only to provide
 * a drag region at the top of the window and a fallback sidebar toggle
 * when the sidebar is collapsed. No title — the document's first h1 is
 * the title and lives in the editor.
 */
export function Toolbar() {
  const { sidebarOpen, toggleSidebar } = useAppStore();

  // If the sidebar is open, it already covers the left drag area.
  // Render nothing at all, letting the editor content reach the top.
  if (sidebarOpen) {
    return (
      <div
        data-tauri-drag-region
        style={{
          height: 32,
          flexShrink: 0,
          background: "var(--bg)",
        }}
      />
    );
  }

  return (
    <header
      className="flex items-center shrink-0 relative"
      style={{
        height: 32,
        background: "var(--bg)",
      }}
    >
      {/* Left drag spacer — leaves room for traffic lights */}
      <div
        data-tauri-drag-region
        style={{ width: 82, height: "100%", flexShrink: 0 }}
      />

      {/* Sidebar-toggle fallback */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center rounded transition-colors shrink-0"
        style={{
          width: 26,
          height: 26,
          color: "var(--fg-tertiary)",
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

      {/* Right drag spacer */}
      <div data-tauri-drag-region className="flex-1" style={{ height: "100%" }} />
    </header>
  );
}
