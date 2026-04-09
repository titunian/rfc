import { useMemo } from "react";
import { useEditorStore } from "../../stores/editor-store";
import { useAppStore } from "../../stores/app-store";

export function StatusBar() {
  const isDirty = useEditorStore((s) => s.isDirty);
  const syncState = useEditorStore((s) => s.syncState);
  const planSlug = useEditorStore((s) => s.planSlug);
  const content = useEditorStore((s) => s.content);
  const { theme, toggleTheme } = useAppStore();

  const words = useMemo(() => {
    const trimmed = content.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [content]);

  const stateLabel =
    syncState === "synced"
      ? "synced"
      : syncState === "dirty"
      ? "modified"
      : syncState === "disk"
      ? "on disk"
      : "draft";

  return (
    <footer
      className="flex items-center justify-between select-none font-mono tabular-nums"
      style={{
        height: 22,
        padding: "0 14px",
        background: "var(--bg-shell)",
        fontSize: 10.5,
        color: "var(--fg-tertiary)",
        flexShrink: 0,
        letterSpacing: 0.01,
      }}
    >
      {/* Left: vim-style state marker */}
      <span className="flex items-center gap-2">
        <span
          style={{ color: isDirty ? "var(--accent)" : "var(--success)" }}
          className={isDirty ? "anim-pulse-dot" : ""}
        >
          {isDirty ? "[+]" : "[●]"}
        </span>
        <span>{stateLabel}</span>
        {planSlug && (
          <>
            <span style={{ color: "var(--muted)" }}>·</span>
            <span>orfc.dev/p/{planSlug}</span>
          </>
        )}
      </span>

      {/* Right: word count + theme */}
      <div className="flex items-center gap-3">
        <span>{words.toLocaleString()}w</span>
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center rounded transition-colors"
          style={{
            width: 18,
            height: 18,
            color: "var(--fg-tertiary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-hover)";
            e.currentTarget.style.color = "var(--fg-secondary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--fg-tertiary)";
          }}
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </footer>
  );
}
