import { useState } from "react";

interface AIConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSaveAndAnalyze: (apiKey: string) => void;
}

export function AIConfigModal({ open, onClose, onSaveAndAnalyze }: AIConfigModalProps) {
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const { loadOrfcConfig, saveOrfcConfig } = await import("../../lib/orfc-config");
      const config = await loadOrfcConfig();
      await saveOrfcConfig({ ...config, anthropicApiKey: trimmed });
      onSaveAndAnalyze(trimmed);
    } catch (err) {
      console.error("[ai-config] save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const openConsole = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open("https://console.anthropic.com");
    } catch {
      window.open("https://console.anthropic.com", "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background: "var(--overlay)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        className="anim-fade-scale"
        style={{
          width: 420,
          maxWidth: "calc(100vw - 48px)",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div>
            <h3
              className="text-[14px] font-semibold"
              style={{ color: "var(--fg)" }}
            >
              Configure AI Analysis
            </h3>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--fg-tertiary)" }}
            >
              Enter your Anthropic API key to enable deep analysis
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{
              width: 28,
              height: 28,
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
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span
              className="text-[12px] font-medium"
              style={{ color: "var(--fg-secondary)" }}
            >
              Anthropic API Key
            </span>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-ant-..."
              autoFocus
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none transition-colors"
              style={{
                background: "var(--bg-sidebar)",
                border: "1px solid var(--border)",
                color: "var(--fg)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSave();
                if (e.key === "Escape") onClose();
              }}
            />
          </label>
          <button
            onClick={openConsole}
            className="text-[12px] text-left transition-colors"
            style={{ color: "var(--accent)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = "underline";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = "none";
            }}
          >
            Get an API key at console.anthropic.com
          </button>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-5 py-3"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
            style={{
              color: "var(--fg-secondary)",
              background: "var(--bg-sidebar)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-sidebar)";
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={!key.trim() || saving}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
            style={{
              color: "#fff",
              background: key.trim() ? "var(--accent)" : "var(--fg-tertiary)",
              opacity: saving ? 0.6 : 1,
              cursor: key.trim() && !saving ? "pointer" : "default",
            }}
          >
            {saving ? "Saving..." : "Save & Analyze"}
          </button>
        </div>
      </div>
    </div>
  );
}
