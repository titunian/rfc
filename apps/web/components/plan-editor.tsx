"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Plan = {
  id: string;
  title: string | null;
  content: string;
};

export function PlanEditor({
  plan,
  onSave,
  onCancel,
}: {
  plan: Plan;
  onSave: (content: string, title: string) => void;
  onCancel: () => void;
}) {
  const [content, setContent] = useState(plan.content);
  const [title, setTitle] = useState(plan.title || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const hasChanges = content !== plan.content || title !== (plan.title || "");

  // Warn on navigation with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  const handleSave = useCallback(async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title: title || "Untitled RFC" }),
      });

      if (res.status === 409) {
        setError(
          "This plan was modified since you started editing. Please refresh the page and try again."
        );
        setSaving(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        setSaving(false);
        return;
      }

      onSave(content, title);
    } catch {
      setError("Network error — please try again.");
      setSaving(false);
    }
  }, [content, title, plan.id, hasChanges, saving, onSave]);

  // Keyboard shortcut: Cmd/Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <div className="max-w-[68ch] mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-[13px] h-8 px-3 rounded-lg border border-[var(--border)] hover:bg-gray-50 transition-colors font-sans"
          >
            {showPreview ? "Edit" : "Preview"}
          </button>
          {hasChanges && (
            <span className="text-[12px] text-amber-600 font-sans">
              Unsaved changes
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="text-[13px] h-8 px-3 rounded-lg border border-[var(--border)] hover:bg-gray-50 transition-colors font-sans"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="text-[13px] h-8 px-4 rounded-lg bg-[var(--fg)] text-white hover:bg-gray-800 transition-colors font-sans font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700 font-sans">
          {error}
        </div>
      )}

      {/* Title input */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full text-[1.25rem] sm:text-[1.5rem] font-semibold tracking-[-0.02em] font-sans leading-[1.3] mb-4 text-[var(--fg)] bg-transparent border-none outline-none placeholder:text-gray-300"
      />

      {showPreview ? (
        <div className="prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full min-h-[60vh] p-4 rounded-lg border border-[var(--border)] bg-white font-mono text-[14px] leading-relaxed text-[var(--fg)] resize-y outline-none focus:border-gray-400 transition-colors"
          placeholder="Write your RFC in markdown…"
          spellCheck={false}
        />
      )}
    </div>
  );
}
