import { useAuthStore } from "../../stores/auth-store";
import { createNewFile, openFileFromDisk } from "../../lib/file-ops";
import { useState } from "react";

/**
 * Full-screen welcome shown when the user is signed out and has no document
 * open. Mirrors the landing page's CLI-forward pitch but tailored for the
 * desktop context.
 */
export function WelcomeScreen() {
  const { status, signIn } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const signingIn = status === "signing-in";

  const copyInstall = async () => {
    try {
      await navigator.clipboard.writeText("npm install -g @orfc/cli");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-8 py-16 select-none relative"
      style={{ background: "var(--bg)" }}
    >
      {/* Top drag region so window is grabbable from the welcome screen */}
      <div
        data-tauri-drag-region
        className="absolute top-0 left-0 right-0"
        style={{ height: 40 }}
      />
      <div className="max-w-[440px] w-full text-center">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span
            className="inline-flex items-center justify-center rounded-[12px] shadow-md"
            style={{
              width: 44,
              height: 44,
              background: "var(--fg)",
              color: "var(--bg)",
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            o
          </span>
          <span
            className="text-[28px] font-bold tracking-[-0.04em]"
            style={{ color: "var(--fg)" }}
          >
            orfc
          </span>
        </div>

        {/* Tagline */}
        <h1
          className="text-[18px] font-semibold tracking-tight leading-snug mb-1.5"
          style={{ color: "var(--fg)" }}
        >
          Your AI agent writes the plan.
        </h1>
        <p
          className="text-[15px] leading-relaxed mb-1"
          style={{ color: "var(--fg-secondary)" }}
        >
          Your team reviews it. You iterate.
        </p>
        <p
          className="text-[13px] leading-relaxed mb-8 max-w-[360px] mx-auto"
          style={{ color: "var(--muted)" }}
        >
          Write markdown, publish with one command, collect inline comments,
          and track every revision.
        </p>

        {/* Primary actions */}
        <div className="flex flex-col gap-2.5 mb-8">
          <button
            onClick={() => {
              if (status === "signed-in") return;
              if (signingIn) return;
              signIn().catch(() => {});
            }}
            disabled={signingIn}
            className="w-full h-10 rounded-[11px] text-[13.5px] font-semibold transition-all flex items-center justify-center gap-2"
            style={{
              background: "var(--fg)",
              color: "var(--bg)",
              opacity: signingIn ? 0.7 : 1,
              cursor: signingIn ? "wait" : "pointer",
            }}
          >
            {signingIn ? (
              <>
                <span
                  className="inline-block w-3.5 h-3.5 rounded-full animate-spin"
                  style={{
                    border: "1.5px solid color-mix(in srgb, currentColor 35%, transparent)",
                    borderTopColor: "currentColor",
                  }}
                />
                Waiting for browser…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
                </svg>
                Sign in to orfc.dev
              </>
            )}
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => void openFileFromDisk()}
              className="flex-1 h-9 rounded-[10px] text-[12.5px] font-medium transition-colors flex items-center justify-center gap-1.5"
              style={{
                background: "var(--bg-sidebar)",
                color: "var(--fg-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-hover)";
                e.currentTarget.style.color = "var(--fg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--bg-sidebar)";
                e.currentTarget.style.color = "var(--fg-secondary)";
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
              Open file
            </button>
            <button
              onClick={() => void createNewFile()}
              className="flex-1 h-9 rounded-[10px] text-[12.5px] font-medium transition-colors flex items-center justify-center gap-1.5"
              style={{
                background: "var(--bg-sidebar)",
                color: "var(--fg-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-hover)";
                e.currentTarget.style.color = "var(--fg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--bg-sidebar)";
                e.currentTarget.style.color = "var(--fg-secondary)";
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New file
            </button>
          </div>
        </div>

        {/* Terminal block — how agents use orfc */}
        <div className="text-left mb-6">
          <p
            className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-2.5 px-1"
            style={{ color: "var(--fg-tertiary)" }}
          >
            Works with any AI agent
          </p>
          <div
            className="rounded-[12px] p-4 font-mono text-[12.5px] leading-relaxed"
            style={{
              background: "#0d1117",
              color: "#e6edf3",
              boxShadow: "var(--shadow-md)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <span className="w-[9px] h-[9px] rounded-full" style={{ background: "#ff5f57" }} />
              <span className="w-[9px] h-[9px] rounded-full" style={{ background: "#febc2e" }} />
              <span className="w-[9px] h-[9px] rounded-full" style={{ background: "#28c840" }} />
            </div>
            <div>
              <span style={{ color: "#6e7681" }}>$ </span>
              <span>orfc push plan.md</span>
            </div>
            <div style={{ color: "#3fb950" }} className="text-[11.5px]">
              ✓ Published → orfc.dev/p/xK7mQ2
            </div>
            <div className="mt-2.5">
              <span style={{ color: "#6e7681" }}>$ </span>
              <span>orfc pull xK7mQ2</span>
            </div>
            <div style={{ color: "#3fb950" }} className="text-[11.5px]">
              ✓ 3 comments pulled
            </div>
            <div className="mt-2.5">
              <span style={{ color: "#6e7681" }}>$ </span>
              <span>orfc comments xK7mQ2</span>
            </div>
            <div style={{ color: "#8b949e" }} className="text-[11.5px]">
              reviewer@co.com · "Consider using a queue here"
            </div>
          </div>
        </div>

        {/* Install CLI — one-click, opens terminal */}
        <div className="text-left mb-6">
          <p
            className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-2 px-1"
            style={{ color: "var(--fg-tertiary)" }}
          >
            CLI tools
          </p>
          <button
            onClick={async () => {
              try {
                const { open } = await import("@tauri-apps/plugin-shell");
                // Open Terminal.app with the install command
                await open("https://www.orfc.dev/self-host");
              } catch {}
              // Also copy the command as a fallback
              copyInstall();
            }}
            className="w-full flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[12.5px] transition-colors"
            style={{
              background: "var(--bg-sidebar)",
              color: "var(--fg-secondary)",
              border: "1px solid var(--border-subtle)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--fg-tertiary)";
              e.currentTarget.style.color = "var(--fg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.color = "var(--fg-secondary)";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span className="flex-1 text-left font-mono">
              npm install -g @orfc/cli
            </span>
            <span
              className="text-[10px] font-sans font-medium px-1.5 py-0.5 rounded"
              style={{
                background: copied ? "var(--success)" : "transparent",
                color: copied ? "#fff" : "var(--muted)",
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </span>
          </button>
        </div>

        {/* Keyboard hint */}
        <p
          className="text-[11px] leading-relaxed"
          style={{ color: "var(--muted)" }}
        >
          Press{" "}
          <kbd
            className="font-mono text-[10px] px-1.5 py-0.5 rounded"
            style={{
              background: "var(--bg-sidebar)",
              border: "1px solid var(--border-subtle)",
              color: "var(--fg-tertiary)",
            }}
          >
            ⌘K
          </kbd>{" "}
          anytime for the command palette
        </p>
      </div>
    </div>
  );
}
