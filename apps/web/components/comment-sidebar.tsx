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
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-50 text-blue-600",
  "bg-violet-50 text-violet-600",
  "bg-emerald-50 text-emerald-600",
  "bg-amber-50 text-amber-600",
  "bg-rose-50 text-rose-600",
  "bg-cyan-50 text-cyan-600",
  "bg-indigo-50 text-indigo-600",
  "bg-orange-50 text-orange-600",
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
    <aside className="w-[340px] shrink-0 sticky top-[53px] h-[calc(100vh-53px)] overflow-y-auto border-l border-[var(--border-light)]">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[13px] font-semibold text-[var(--fg)] tracking-tight font-sans flex items-center gap-2">
            Discussion
            {unresolved.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 text-[11px] font-semibold bg-[var(--fg)] text-white rounded-full px-1.5">
                {unresolved.length}
              </span>
            )}
          </h2>
        </div>

        {/* Empty state */}
        {comments.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-5 h-5 text-gray-300"
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
            <p className="text-[13px] text-[var(--muted)] font-sans">
              No comments yet
            </p>
            <p className="text-[12px] text-gray-400 font-sans mt-1">
              Select text to start a discussion
            </p>
          </div>
        )}

        {/* Unresolved comments */}
        <div className="space-y-1">
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
          <div className="mt-6 pt-4 border-t border-[var(--border-light)]">
            <button
              onClick={() => setShowResolved(!showResolved)}
              className="flex items-center gap-1.5 text-[12px] text-[var(--muted)] hover:text-[var(--fg)] font-sans font-medium transition-colors w-full"
            >
              <svg
                className={`w-3 h-3 transition-transform duration-150 ${showResolved ? "rotate-90" : ""}`}
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
              <div className="space-y-1 mt-2">
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
      className={`group rounded-lg p-3 cursor-pointer transition-all duration-150 ${
        isActive
          ? "bg-amber-50/80 ring-1 ring-amber-200/60"
          : "hover:bg-gray-50/80"
      } ${comment.resolved ? "opacity-50" : ""}`}
      onClick={onClick}
    >
      {/* Quoted anchor text */}
      {comment.anchorText && (
        <div className="text-[12px] text-amber-700/60 bg-amber-50/60 rounded-md px-2.5 py-1.5 mb-2.5 line-clamp-2 font-serif italic border-l-2 border-amber-300/50">
          &ldquo;{comment.anchorText}&rdquo;
        </div>
      )}

      {/* Author row + content */}
      <div className="flex items-start gap-2.5">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${getAvatarColor(comment.authorName)}`}
        >
          {getInitials(comment.authorName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[13px] font-medium text-[var(--fg)] font-sans truncate">
              {comment.authorName}
            </span>
            <span className="text-[11px] text-gray-400 font-sans shrink-0">
              {formatTime(comment.createdAt)}
            </span>
          </div>
          <p className="text-[13px] text-[var(--fg-secondary)] leading-[1.6] font-sans">
            {comment.content}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResolve();
            }}
            className="mt-1.5 text-[11px] text-gray-400 hover:text-[var(--fg)] font-sans font-medium opacity-0 group-hover:opacity-100 transition-all duration-150"
          >
            {comment.resolved ? "↩ Reopen" : "✓ Resolve"}
          </button>
        </div>
      </div>
    </div>
  );
}
