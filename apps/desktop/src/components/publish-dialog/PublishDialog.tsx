import { useEffect, useState } from "react";
import { useAppStore } from "../../stores/app-store";
import { useAuthStore } from "../../stores/auth-store";
import { useEditorStore } from "../../stores/editor-store";
import { useCloudStore } from "../../stores/cloud-store";
import { open as openUrl } from "@tauri-apps/plugin-shell";

type Access = "anyone" | "allowlist" | "private";

export function PublishDialog() {
  const { publishDialogOpen, closePublishDialog, openAuthModal } = useAppStore();
  const { status } = useAuthStore();
  const { planId, planUrl, fileName, content, attachCloud } = useEditorStore();
  const { publish } = useCloudStore();

  const [title, setTitle] = useState(fileName);
  const [access, setAccess] = useState<Access>("anyone");
  const [allowedViewers, setAllowedViewers] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; slug: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (publishDialogOpen) {
      setTitle(fileName || "Untitled");
      setAccess("anyone");
      setAllowedViewers("");
      setBusy(false);
      setError(null);
      setResult(null);
      setCopied(false);
    }
  }, [publishDialogOpen, fileName]);

  if (!publishDialogOpen) return null;

  const updating = !!planId;
  const signedIn = status === "signed-in";

  async function handlePublish() {
    if (!signedIn) {
      closePublishDialog();
      openAuthModal();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await publish({
        planId,
        title: title.trim() || "Untitled",
        content,
        accessRule: access,
        allowedViewers:
          access === "allowlist" ? allowedViewers.trim() || undefined : undefined,
      });
      // Attach the result to the editor state
      const apiUrl = useAuthStore.getState().apiUrl;
      attachCloud({
        planId: res.id,
        planSlug: res.slug,
        planUrl: res.url || `${apiUrl}/p/${res.slug}`,
        planVersion: (useCloudStore.getState().currentVersion ?? 0) + 1,
        title: res.title ?? title,
        content,
      });
      setResult({ url: res.url || `${apiUrl}/p/${res.slug}`, slug: res.slug });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background: "var(--overlay)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={busy ? undefined : closePublishDialog}
    >
      <div
        className="anim-fade-scale"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          className="px-6 pt-5 pb-4"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <h2
            className="text-[15px] font-semibold tracking-tight mb-1"
            style={{ color: "var(--fg)" }}
          >
            {result
              ? "Published"
              : updating
              ? "Publish new version"
              : "Publish to orfc.dev"}
          </h2>
          <p
            className="text-[11.5px] leading-relaxed"
            style={{ color: "var(--fg-tertiary)" }}
          >
            {result
              ? "Your draft is live on orfc.dev."
              : updating
              ? "Your local changes will become version " +
                (((useCloudStore.getState().currentVersion ?? 0) as number) +
                  1) +
                " of this document."
              : "Create a shareable URL, collect inline comments, and track versions."}
          </p>
        </div>

        {/* Body */}
        {result ? (
          <div className="px-6 py-5 space-y-3">
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-[10px]"
              style={{
                background: "var(--bg-sidebar)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--muted)", flexShrink: 0 }}
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span
                className="flex-1 text-[12px] truncate font-mono"
                style={{ color: "var(--fg-secondary)" }}
                title={result.url}
              >
                {result.url}
              </span>
              <button
                onClick={() => handleCopy(result.url)}
                className="text-[11px] font-medium px-2 py-1 rounded transition-colors"
                style={{
                  background: copied ? "var(--success)" : "var(--bg)",
                  color: copied ? "white" : "var(--fg-secondary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => openUrl(result.url).catch(() => {})}
                className="flex-1 h-9 rounded-lg text-[12.5px] font-medium transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: "var(--fg)",
                  color: "var(--bg)",
                }}
              >
                Open in browser
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
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
              <button
                onClick={closePublishDialog}
                className="h-9 px-4 rounded-lg text-[12.5px] font-medium transition-colors"
                style={{
                  background: "var(--bg-sidebar)",
                  color: "var(--fg-secondary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {/* Title */}
            <div>
              <label
                className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5 block"
                style={{ color: "var(--fg-tertiary)" }}
              >
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled"
                autoFocus
                className="w-full text-[13px] rounded-[10px] px-2.5 py-2 outline-none transition-colors"
                style={{
                  background: "var(--bg-sidebar)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--fg)",
                }}
              />
            </div>

            <div>
              <label
                className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5 block"
                style={{ color: "var(--fg-tertiary)" }}
              >
                Access
              </label>
              <div className="flex gap-1.5">
                <AccessPill
                  active={access === "anyone"}
                  onClick={() => setAccess("anyone")}
                  icon={
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  }
                  label="Anyone"
                />
                <AccessPill
                  active={access === "allowlist"}
                  onClick={() => setAccess("allowlist")}
                  icon={
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="m22 11-3 3-2-2" />
                    </svg>
                  }
                  label="Specific people"
                />
                <AccessPill
                  active={access === "private"}
                  onClick={() => setAccess("private")}
                  icon={
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  }
                  label="Only me"
                />
              </div>

              {access === "allowlist" && (
                <div className="mt-2 anim-fade-scale">
                  <textarea
                    value={allowedViewers}
                    onChange={(e) => setAllowedViewers(e.target.value)}
                    placeholder="alice@co.com, bob@co.com"
                    rows={2}
                    className="w-full text-[12.5px] font-mono rounded-[10px] px-2.5 py-2 outline-none transition-colors resize-none"
                    style={{
                      background: "var(--bg-sidebar)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--fg)",
                    }}
                  />
                  <p
                    className="text-[10.5px] mt-1 px-1"
                    style={{ color: "var(--fg-tertiary)" }}
                  >
                    Comma-separated emails. Only these accounts will be able to
                    view + comment.
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div
                className="text-[11.5px] px-3 py-2 rounded-[10px]"
                style={{
                  background: "var(--danger-soft)",
                  border: "1px solid var(--danger-border)",
                  color: "var(--danger)",
                }}
              >
                {error}
              </div>
            )}

            {updating && planUrl && (
              <p
                className="text-[11px] font-mono truncate"
                style={{ color: "var(--fg-tertiary)" }}
                title={planUrl}
              >
                {planUrl}
              </p>
            )}

            <div className="flex items-center justify-end gap-1.5 pt-1">
              <button
                onClick={closePublishDialog}
                disabled={busy}
                className="h-9 px-4 rounded-lg text-[12.5px] font-medium transition-colors"
                style={{
                  color: "var(--fg-tertiary)",
                  opacity: busy ? 0.4 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={busy || !title.trim() || !content.trim()}
                className="h-9 px-4 rounded-lg text-[12.5px] font-medium transition-all flex items-center gap-1.5"
                style={{
                  background: "var(--fg)",
                  color: "var(--bg)",
                  opacity: busy || !title.trim() || !content.trim() ? 0.5 : 1,
                  cursor:
                    busy || !title.trim() || !content.trim()
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {busy ? "Publishing…" : "Publish"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AccessPill({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-medium px-2.5 py-2 rounded-[10px] transition-all"
      style={{
        background: active ? "var(--accent-soft)" : "var(--bg-sidebar)",
        color: active ? "var(--accent)" : "var(--fg-secondary)",
        border: active
          ? "1px solid var(--accent)"
          : "1px solid var(--border-subtle)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
