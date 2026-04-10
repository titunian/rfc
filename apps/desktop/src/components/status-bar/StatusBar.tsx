import { useMemo, useState } from "react";
import { useEditorStore } from "../../stores/editor-store";
import { useAppStore } from "../../stores/app-store";
import { open as openUrl } from "@tauri-apps/plugin-shell";

export function StatusBar() {
  const isDirty = useEditorStore((s) => s.isDirty);
  const syncState = useEditorStore((s) => s.syncState);
  const planSlug = useEditorStore((s) => s.planSlug);
  const content = useEditorStore((s) => s.content);
  const { theme, toggleTheme } = useAppStore();
  const [urlCopied, setUrlCopied] = useState(false);

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
            <span
              onClick={() => void openUrl(`https://orfc.dev/p/${planSlug}`)}
              style={{ cursor: "pointer", textDecoration: "none" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.textDecoration = "underline";
                (e.currentTarget as HTMLElement).style.color = "var(--fg-secondary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.textDecoration = "none";
                (e.currentTarget as HTMLElement).style.color = "";
              }}
              title="Open in browser"
            >
              orfc.dev/p/{planSlug}
            </span>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`https://orfc.dev/p/${planSlug}`);
                  setUrlCopied(true);
                  setTimeout(() => setUrlCopied(false), 1500);
                } catch { /* ignore */ }
              }}
              className="flex items-center justify-center rounded transition-colors"
              style={{
                width: 14,
                height: 14,
                color: urlCopied ? "var(--success)" : "var(--muted)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                if (!urlCopied) e.currentTarget.style.color = "var(--fg-secondary)";
              }}
              onMouseLeave={(e) => {
                if (!urlCopied) e.currentTarget.style.color = "var(--muted)";
              }}
              title={urlCopied ? "Copied!" : "Copy URL"}
            >
              {urlCopied ? (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
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
