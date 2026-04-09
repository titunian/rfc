import { useAuthStore } from "../../stores/auth-store";
import { useAppStore } from "../../stores/app-store";

export function AuthModal() {
  const {
    authModalOpen,
    closeAuthModal,
  } = useAppStore();
  const { status, error, signIn, apiUrl } = useAuthStore();

  if (!authModalOpen) return null;

  const busy = status === "signing-in";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background: "var(--overlay)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={busy ? undefined : closeAuthModal}
    >
      <div
        className="anim-fade-scale"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex flex-col items-center text-center px-8 pt-9 pb-6"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div
            className="flex items-center justify-center mb-4 anim-slide-up"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--fg)",
              color: "var(--bg)",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              boxShadow: "var(--shadow-md)",
            }}
          >
            o
          </div>
          <h2
            className="text-[17px] font-semibold tracking-tight mb-1.5"
            style={{ color: "var(--fg)" }}
          >
            Sign in to orfc.dev
          </h2>
          <p
            className="text-[12.5px] leading-relaxed max-w-[320px]"
            style={{ color: "var(--fg-tertiary)" }}
          >
            Publish drafts, collect inline comments, and sync your writing across
            devices. We&rsquo;ll open your browser to finish sign-in.
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-5">
          <div className="flex items-center justify-between mb-2.5">
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: "var(--fg-tertiary)" }}
            >
              Server
            </span>
            <span
              className="text-[11px] font-mono truncate max-w-[240px]"
              style={{ color: "var(--fg-secondary)" }}
              title={apiUrl}
            >
              {apiUrl}
            </span>
          </div>

          <button
            onClick={async () => {
              try {
                await signIn();
                closeAuthModal();
              } catch {
                // error shown inline
              }
            }}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 font-medium transition-all"
            style={{
              height: 40,
              borderRadius: 9,
              background: "var(--fg)",
              color: "var(--bg)",
              fontSize: 13,
              opacity: busy ? 0.7 : 1,
              cursor: busy ? "wait" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!busy) e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              if (!busy) e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {busy ? (
              <>
                <Spinner />
                Waiting for browser…
              </>
            ) : (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                  <path d="M21 19V5a2 2 0 0 0-2-2h-4" />
                </svg>
                Sign in with orfc.dev
              </>
            )}
          </button>

          {error && (
            <div
              className="mt-3 text-[11.5px] px-3 py-2 rounded-[10px]"
              style={{
                background: "var(--danger-soft)",
                border: "1px solid var(--danger-border)",
                color: "var(--danger)",
              }}
            >
              {error}
            </div>
          )}

          <p
            className="text-[11px] leading-relaxed mt-4"
            style={{ color: "var(--fg-tertiary)" }}
          >
            Your browser will open the orfc sign-in page. Complete the email code
            there — we&rsquo;ll pick up the session automatically.
          </p>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end px-8 py-3"
          style={{
            background: "var(--bg-sidebar)",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <button
            onClick={closeAuthModal}
            disabled={busy}
            className="text-[12px] transition-colors"
            style={{
              color: "var(--fg-tertiary)",
              opacity: busy ? 0.4 : 1,
              cursor: busy ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!busy) e.currentTarget.style.color = "var(--fg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--fg-tertiary)";
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block"
      style={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        border: "1.5px solid color-mix(in srgb, currentColor 35%, transparent)",
        borderTopColor: "currentColor",
        animation: "spin 700ms linear infinite",
      }}
    />
  );
}

// Tiny inline keyframes for spinner
if (typeof document !== "undefined") {
  const id = "orfc-spin-keyframes";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }
}
