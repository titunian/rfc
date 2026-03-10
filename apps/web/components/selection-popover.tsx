"use client";

import { useState, useRef, useEffect } from "react";

export function SelectionPopover({
  rect,
  onComment,
  onDismiss,
}: {
  rect: DOMRect;
  onComment: (text: string) => void;
  onDismiss: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onDismiss();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onDismiss]);

  const submit = () => {
    if (commentText.trim()) {
      onComment(commentText.trim());
      setCommentText("");
      setIsExpanded(false);
    }
  };

  const top = rect.top + window.scrollY - 40;
  const left = rect.left + rect.width / 2;

  if (!isExpanded) {
    return (
      <div
        ref={popoverRef}
        className="selection-popover"
        style={{ top, left, transform: "translateX(-50%)" }}
      >
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg shadow-lg hover:bg-gray-800 transition-colors"
        >
          <svg
            className="w-4 h-4"
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
      className="selection-popover"
      style={{ top, left, transform: "translateX(-50%)" }}
    >
      <div className="bg-white border border-[var(--border)] rounded-lg shadow-xl p-3 w-[300px] font-sans">
        <textarea
          ref={textareaRef}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a comment..."
          className="w-full text-sm border border-[var(--border)] rounded-md p-2 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              submit();
            }
            if (e.key === "Escape") {
              onDismiss();
            }
          }}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-[var(--muted)]">
            {typeof navigator !== "undefined" &&
            navigator.platform?.includes("Mac")
              ? "Cmd"
              : "Ctrl"}
            +Enter to submit
          </span>
          <div className="flex gap-2">
            <button
              onClick={onDismiss}
              className="text-sm px-3 py-1 text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!commentText.trim()}
              className="text-sm px-3 py-1 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
