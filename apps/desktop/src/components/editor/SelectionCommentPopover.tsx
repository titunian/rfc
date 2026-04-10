import { useState, useRef, useEffect, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { useCloudStore } from "../../stores/cloud-store";
import { useEditorStore } from "../../stores/editor-store";
import { useAppStore } from "../../stores/app-store";

interface SelectionCommentPopoverProps {
  editor: Editor;
}

export function SelectionCommentPopover({
  editor,
}: SelectionCommentPopoverProps) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Capture the selection range when we show the chip, so it survives
  // focus moving to the textarea.
  const selectionRef = useRef<{ from: number; to: number } | null>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    setExpanded(false);
    setCommentText("");
    selectionRef.current = null;
  }, []);

  // Listen for selection changes in the editor.
  useEffect(() => {
    const onSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        // Collapsed — only dismiss if we're not in the expanded textarea
        if (!expanded) {
          dismiss();
        }
        return;
      }

      // Non-collapsed selection: show the chip.
      try {
        const coordsAt = editor.view.coordsAtPos(from);
        setCoords({ top: coordsAt.top, left: coordsAt.left });
        selectionRef.current = { from, to };
        setVisible(true);
        // Reset to chip state when selection changes
        if (!expanded) {
          setExpanded(false);
          setCommentText("");
        }
      } catch {
        // coordsAtPos can throw for edge cases — just ignore.
      }
    };

    editor.on("selectionUpdate", onSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", onSelectionUpdate);
    };
  }, [editor, expanded, dismiss]);

  // Focus textarea when expanded.
  useEffect(() => {
    if (expanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [expanded]);

  // Click-outside dismissal.
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        dismiss();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible, dismiss]);

  const submit = useCallback(async () => {
    const sel = selectionRef.current;
    if (!commentText.trim() || !sel) return;

    const planId = useEditorStore.getState().planId;
    if (!planId) return;

    const anchorText = editor.state.doc.textBetween(sel.from, sel.to, " ");
    if (!anchorText) return;

    setSubmitting(true);
    try {
      await useCloudStore.getState().addComment(planId, commentText.trim(), anchorText);
      // Open comments panel so the new comment is visible
      useAppStore.getState().toggleRightPanel("comments");
      // Clear selection in the editor
      editor.commands.setTextSelection(sel.to);
      dismiss();
    } finally {
      setSubmitting(false);
    }
  }, [commentText, editor, dismiss]);

  // Public trigger: called from keyboard shortcut
  useEffect(() => {
    const handler = () => {
      const { from, to } = editor.state.selection;
      if (from === to) return;
      try {
        const coordsAt = editor.view.coordsAtPos(from);
        setCoords({ top: coordsAt.top, left: coordsAt.left });
        selectionRef.current = { from, to };
        setVisible(true);
        setExpanded(true);
      } catch {
        // ignore
      }
    };
    window.addEventListener("orfc:comment-on-selection", handler);
    return () =>
      window.removeEventListener("orfc:comment-on-selection", handler);
  }, [editor]);

  if (!visible) return null;

  const popoverTop = coords.top - 44;
  const popoverLeft = coords.left;

  if (!expanded) {
    return (
      <div
        ref={popoverRef}
        className="selection-comment-popover"
        style={{
          position: "fixed",
          top: popoverTop,
          left: popoverLeft,
          transform: "translateX(-50%)",
          zIndex: 9999,
        }}
      >
        <button
          onClick={() => setExpanded(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            background: "var(--fg)",
            color: "var(--bg)",
            fontSize: "13px",
            fontWeight: 500,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            boxShadow: "var(--shadow-lg)",
            lineHeight: 1.3,
            whiteSpace: "nowrap",
          }}
        >
          <svg
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
          Comment
        </button>
      </div>
    );
  }

  return (
    <div
      ref={popoverRef}
      className="selection-comment-popover"
      style={{
        position: "fixed",
        top: popoverTop,
        left: popoverLeft,
        transform: "translateX(-50%)",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          boxShadow: "var(--shadow-lg)",
          padding: "12px",
          width: "300px",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        }}
      >
        <textarea
          ref={textareaRef}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          style={{
            width: "100%",
            fontSize: "13px",
            lineHeight: 1.5,
            background: "var(--bg-sidebar)",
            color: "var(--fg)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "8px 10px",
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--accent)";
            e.currentTarget.style.boxShadow =
              "0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              dismiss();
              editor.commands.focus();
            }
            // Prevent the event from reaching the editor's keydown handler
            e.stopPropagation();
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "8px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              color: "var(--muted)",
              fontFamily: "inherit",
            }}
          >
            {"\u2318"}Enter to submit
          </span>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => {
                dismiss();
                editor.commands.focus();
              }}
              style={{
                fontSize: "13px",
                padding: "4px 10px",
                background: "transparent",
                color: "var(--muted)",
                border: "none",
                cursor: "pointer",
                borderRadius: "6px",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!commentText.trim() || submitting}
              style={{
                fontSize: "13px",
                padding: "4px 12px",
                background: "var(--fg)",
                color: "var(--bg)",
                border: "none",
                borderRadius: "6px",
                cursor:
                  !commentText.trim() || submitting
                    ? "not-allowed"
                    : "pointer",
                opacity: !commentText.trim() || submitting ? 0.4 : 1,
                fontWeight: 500,
                fontFamily: "inherit",
              }}
            >
              {submitting ? "Posting..." : "Comment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
