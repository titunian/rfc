"use client";

type Comment = {
  id: string;
  authorName: string;
  authorEmail: string | null;
  content: string;
  anchorText: string | null;
  resolved: boolean;
  createdAt: string;
};

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
  const unresolved = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);

  return (
    <aside className="w-[380px] border-l border-[var(--border)] bg-white/95 backdrop-blur-sm sticky top-[53px] h-[calc(100vh-53px)] overflow-y-auto font-sans">
      <div className="p-4 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold">
          Comments{" "}
          {unresolved.length > 0 && (
            <span className="text-[var(--muted)] font-normal">
              ({unresolved.length})
            </span>
          )}
        </h2>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {unresolved.length === 0 && resolved.length === 0 && (
          <div className="p-6 text-center text-sm text-[var(--muted)]">
            <p>No comments yet.</p>
            <p className="mt-1">Select text to add a comment.</p>
          </div>
        )}

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

        {resolved.length > 0 && (
          <div className="p-4">
            <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
              Resolved ({resolved.length})
            </p>
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
      className={`p-4 cursor-pointer hover:bg-[var(--bg-warm)] transition-colors ${
        isActive ? "bg-yellow-50 border-l-2 border-yellow-400" : ""
      } ${comment.resolved ? "opacity-60" : ""}`}
      onClick={onClick}
    >
      {comment.anchorText && (
        <div className="text-xs text-[var(--muted)] bg-yellow-50 border-l-2 border-yellow-300 px-2 py-1 mb-2 line-clamp-2 italic">
          &ldquo;{comment.anchorText}&rdquo;
        </div>
      )}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium">{comment.authorName}</span>
        <span className="text-xs text-[var(--muted)]">
          {formatTime(comment.createdAt)}
        </span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">
        {comment.content}
      </p>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onResolve();
        }}
        className="mt-2 text-xs text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
      >
        {comment.resolved ? "Unresolve" : "Resolve"}
      </button>
    </div>
  );
}
