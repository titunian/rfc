import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../stores/app-store";
import { useAuthStore } from "../../stores/auth-store";
import { useEditorStore } from "../../stores/editor-store";
import { useCloudStore } from "../../stores/cloud-store";

type Access = "anyone" | "allowlist" | "private";

export function SettingsDialog() {
  const { settingsOpen, closeSettings } = useAppStore();
  const { client } = useAuthStore();
  const { planId, planUrl, detachCloud } = useEditorStore();
  const { updateAccess, fetchPlan } = useCloudStore();

  const [access, setAccess] = useState<Access>("anyone");
  const [allowedViewers, setAllowedViewers] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-revert delete confirmation after 3 seconds
  useEffect(() => {
    if (confirmDelete && !deleting) {
      deleteTimerRef.current = setTimeout(() => setConfirmDelete(false), 3000);
      return () => {
        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      };
    }
  }, [confirmDelete, deleting]);

  // Fetch current plan data when dialog opens
  useEffect(() => {
    if (settingsOpen && planId) {
      setError(null);
      setSaved(false);
      setCopied(false);
      setConfirmDelete(false);
      setDeleting(false);
      setLoading(true);

      fetchPlan(planId).then((plan) => {
        if (plan) {
          // accessRule and allowedViewers are returned by the API but not
          // in the PlanDetail type, so access them via an untyped cast.
          const data = plan as unknown as {
            accessRule?: string;
            allowedViewers?: string;
          };
          const rule = data.accessRule;
          if (rule === "allowlist") setAccess("allowlist");
          else if (rule === "private") setAccess("private");
          else setAccess("anyone");

          setAllowedViewers(data.allowedViewers ?? "");
        }
        setLoading(false);
      });
    }
  }, [settingsOpen, planId, fetchPlan]);

  if (!settingsOpen || !planId) return null;

  async function handleSave() {
    if (!planId) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await updateAccess(planId, {
        accessRule: access,
        allowedViewers:
          access === "allowlist" ? allowedViewers.trim() || undefined : undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!client || !planId) return;
    setDeleting(true);
    try {
      await client.deletePlan(planId);
      detachCloud();
      void useCloudStore.getState().fetchPlans();
      closeSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeleting(false);
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
      onClick={busy || deleting ? undefined : closeSettings}
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
            Document settings
          </h2>
          <p
            className="text-[11.5px] leading-relaxed"
            style={{ color: "var(--fg-tertiary)" }}
          >
            Manage permissions and access for this published document.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {loading ? (
            <div
              className="text-[12.5px] py-4 text-center"
              style={{ color: "var(--fg-tertiary)" }}
            >
              Loading settings...
            </div>
          ) : (
            <>
              {/* URL display */}
              {planUrl && (
                <div>
                  <label
                    className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5 block"
                    style={{ color: "var(--fg-tertiary)" }}
                  >
                    URL
                  </label>
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
                      title={planUrl}
                    >
                      {planUrl}
                    </span>
                    <button
                      onClick={() => handleCopy(planUrl)}
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
                </div>
              )}

              {/* Access */}
              <div>
                <label
                  className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5 block"
                  style={{ color: "var(--fg-tertiary)" }}
                >
                  Access
                </label>
                <div className="space-y-1.5">
                  <AccessRow
                    active={access === "anyone"}
                    onClick={() => setAccess("anyone")}
                    icon={
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                    }
                    label="Anyone with the link"
                    description="No sign-in required to view"
                  />
                  <AccessRow
                    active={access === "private"}
                    onClick={() => setAccess("private")}
                    icon={
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    }
                    label="Anyone signed in"
                    description="Viewers must have an orfc.dev account"
                  />
                  <AccessRow
                    active={access === "allowlist"}
                    onClick={() => setAccess("allowlist")}
                    icon={
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="m22 11-3 3-2-2" />
                      </svg>
                    }
                    label="Specific people"
                    description="Only listed emails can view"
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

              {/* Delete section */}
              <div
                className="pt-3"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                <label
                  className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5 block"
                  style={{ color: "var(--fg-tertiary)" }}
                >
                  Danger zone
                </label>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-[12px] font-medium px-3 py-2 rounded-[10px] transition-colors"
                    style={{
                      color: "var(--danger)",
                      background: "var(--danger-soft)",
                      border: "1px solid var(--danger-border)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--danger)";
                      e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--danger-soft)";
                      e.currentTarget.style.color = "var(--danger)";
                    }}
                  >
                    Delete from cloud
                  </button>
                ) : (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-[12px] font-medium px-4 py-2 rounded-[10px] transition-all anim-fade-scale"
                    style={{
                      background: "var(--danger)",
                      color: "#fff",
                      border: "1px solid var(--danger)",
                      opacity: deleting ? 0.5 : 1,
                      cursor: deleting ? "not-allowed" : "pointer",
                    }}
                  >
                    {deleting ? "Deleting..." : "Are you sure? Delete permanently"}
                  </button>
                )}
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  onClick={closeSettings}
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
                  onClick={handleSave}
                  disabled={busy}
                  className="h-9 px-4 rounded-lg text-[12.5px] font-medium transition-all flex items-center gap-1.5"
                  style={{
                    background: saved ? "var(--success)" : "var(--fg)",
                    color: saved ? "#fff" : "var(--bg)",
                    opacity: busy ? 0.5 : 1,
                    cursor: busy ? "not-allowed" : "pointer",
                  }}
                >
                  {busy ? "Saving..." : saved ? "Saved" : "Save"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AccessRow({
  active,
  onClick,
  icon,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-all text-left"
      style={{
        background: active ? "var(--accent-soft)" : "var(--bg-sidebar)",
        border: active
          ? "1px solid var(--accent)"
          : "1px solid var(--border-subtle)",
      }}
    >
      <span
        className="flex items-center justify-center shrink-0"
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: active ? "var(--accent)" : "var(--bg)",
          color: active ? "#fff" : "var(--fg-secondary)",
        }}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span
          className="block text-[12.5px] font-medium"
          style={{ color: active ? "var(--accent)" : "var(--fg)" }}
        >
          {label}
        </span>
        <span
          className="block text-[11px] mt-0.5"
          style={{ color: "var(--fg-tertiary)" }}
        >
          {description}
        </span>
      </span>
      {active && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--accent)", flexShrink: 0 }}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  );
}
