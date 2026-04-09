"use client";

import { useState } from "react";

type Comment = {
  id: string;
  authorName: string;
  authorEmail: string | null;
  content: string;
  anchorText: string | null;
  resolved: boolean;
  createdAt: string;
};

function getInitials(name: string) {
  if (name.includes("@")) return name[0].toUpperCase();
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getDisplayName(comment: Comment) {
  return comment.authorEmail || comment.authorName;
}

// Dark-mode-aware avatar palette.
const AVATAR_COLORS = [
  "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300",
  "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
  "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function CommentSidebar({
  comments,
  activeCommentId,
  onCommentClick,
  onResolve,
}: {
  comments: Comment[];
  activeCommentId: string | null;
  onCommentClick: (id: string | null) => void;
  onResolve: (id: string) => void;
}) {
  const [showResolved, setShowResolved] = useState(false);
  const unresolved = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);

  return (
    <aside className="w-[360px] shrink-0 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto border-l border-[var(--border-light)] bg-[var(--bg-warm)] flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 sticky top-0 bg-[var(--bg-warm)]/95 backdrop-blur-sm z-10 border-b border-[var(--border-light)]">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold text-[var(--fg)] tracking-tight font-sans flex items-center gap-2">
            Discussion
            {unresolved.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-[18px] text-[10px] font-semibold bg-[var(--accent)] text-white rounded-full px-1.5">
                {unresolved.length}
              </span>
            )}
          </h2>
          {comments.length > 0 && (
            <span className="text-[11px] text-[var(--muted)] font-sans">
              {comments.length} total
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 px-3 py-3">
        {/* Empty state */}
        {comments.length === 0 && (
          <div className="py-16 text-center px-4">
            <div className="w-11 h-11 rounded-full bg-[var(--bg)] border border-[var(--border-light)] flex items-center justify-center mx-auto mb-3.5 shadow-sm">
              <svg
                className="w-5 h-5 text-[var(--muted)]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                />
              </svg>
            </div>
            <p className="text-[13px] font-medium text-[var(--fg)] font-sans mb-1">
              No comments yet
            </p>
            <p className="text-[12px] text-[var(--muted)] font-sans leading-relaxed max-w-[220px] mx-auto">
              Select any text in the document to start a discussion.
            </p>
          </div>
        )}

        {/* Unresolved comments */}
        <div className="space-y-1.5">
          {unresolved.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              isActive={comment.id === activeCommentId}
              onClick={() =>
                onCommentClick(
                  comment.id === activeCommentId ? null : comment.id
                )
              }
              onResolve={() => onResolve(comment.id)}
            />
          ))}
        </div>

        {/* Resolved section */}
        {resolved.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[var(--border-light)]">
            <button
              onClick={() => setShowResolved(!showResolved)}
              className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] hover:text-[var(--fg)] font-sans font-medium transition-colors px-2 w-full uppercase tracking-[0.06em]"
            >
              <svg
                className={`w-3 h-3 transition-transform duration-150 ${
                  showResolved ? "rotate-90" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
              {resolved.length} resolved
            </button>
            {showResolved && (
              <div className="space-y-1.5 mt-3">
                {resolved.map((comment) => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    isActive={comment.id === activeCommentId}
                    onClick={() =>
                      onCommentClick(
                        comment.id === activeCommentId ? null : comment.id
                      )
                    }
                    onResolve={() => onResolve(comment.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function CommentCard({
  comment,
  isActive,
  onClick,
  onResolve,
}: {
  comment: Comment;
  isActive: boolean;
  onClick: () => void;
  onResolve: () => void;
}) {
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-xl cursor-pointer transition-all duration-150 border ${
        isActive
          ? "bg-[var(--bg)] border-[var(--accent)] shadow-[0_0_0_3px_var(--accent-light)]"
          : comment.resolved
          ? "bg-transparent border-transparent hover:bg-[var(--button-hover)]"
          : "bg-[var(--bg)] border-[var(--border-light)] hover:border-[var(--border)] shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
      }`}
    >
      {/* Active indicator stripe */}
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-[var(--accent)]"
        />
      )}

      <div className="p-3">
        {/* Quoted anchor text */}
        {comment.anchorText && (
          <div className="flex gap-2 mb-2.5">
            <span
              aria-hidden="true"
              className="shrink-0 w-[2px] rounded-full bg-[var(--quote-border)]"
            />
            <div
              className={`text-[11.5px] font-sans leading-snug line-clamp-2 italic ${
                comment.resolved
                  ? "text-[var(--muted)]"
                  : "text-[var(--fg-secondary)]"
              }`}
            >
              {comment.anchorText}
            </div>
          </div>
        )}

        {/* Author row */}
        <div className="flex items-start gap-2.5">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10.5px] font-bold shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/5 ${getAvatarColor(
              getDisplayName(comment)
            )} ${comment.resolved ? "opacity-70" : ""}`}
          >
            {getInitials(getDisplayName(comment))}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span
                className={`text-[12.5px] font-semibold font-sans truncate ${
                  comment.resolved
                    ? "text-[var(--muted)]"
                    : "text-[var(--fg)]"
                }`}
              >
                {getDisplayName(comment)}
              </span>
              <span className="text-[10.5px] text-[var(--muted)] font-sans shrink-0">
                {formatTime(comment.createdAt)}
              </span>
            </div>
            <p
              className={`text-[13px] leading-[1.55] font-sans whitespace-pre-wrap ${
                comment.resolved
                  ? "text-[var(--muted)] line-through decoration-[var(--muted)]/40"
                  : "text-[var(--fg-secondary)]"
              }`}
            >
              {comment.content}
            </p>
          </div>
        </div>

        {/* Actions row */}
        <div className="mt-2 pl-[38px] flex items-center gap-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResolve();
            }}
            className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              {comment.resolved ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              )}
            </svg>
            {comment.resolved ? "Reopen" : "Resolve"}
          </button>
        </div>
      </div>
    </div>
  );
}
