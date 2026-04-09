import { useEffect, useState } from "react";
import { useCloudStore } from "../../stores/cloud-store";
import { useEditorStore } from "../../stores/editor-store";
import { useAuthStore } from "../../stores/auth-store";
import { useAppStore } from "../../stores/app-store";

function relativeTime(iso: string) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const secs = Math.max(0, Math.floor((now - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function initialsFor(name: string) {
  if (!name) return "?";
  if (name.includes("@")) return name[0].toUpperCase();
  const parts = name.split(/\s+/).filter(Boolean);
  return (
    (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")
  ).toUpperCase() || "?";
}

const AVATAR_COLORS = [
  "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300",
];

function avatarClass(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function CommentsDrawer() {
  const { closeRightPanel } = useAppStore();
  const { planId, planSlug } = useEditorStore();
  const { email } = useAuthStore();
  const {
    comments,
    commentsLoading,
    commentsError,
    fetchComments,
    addComment,
    resolveComment,
  } = useCloudStore();

  const [showResolved, setShowResolved] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [focusedCommentId, setFocusedCommentId] = useState<string | null>(null);

  useEffect(() => {
    if (planId) void fetchComments(planId);
  }, [planId, fetchComments]);

  // Scroll a comment card into view when the editor requests it (via
  // clicking a highlight) OR when set programmatically.
  useEffect(() => {
    const onFocus = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (detail?.id) {
        setFocusedCommentId(detail.id);
        // Wait a tick for the drawer to render, then scroll.
        setTimeout(() => {
          const el = document.querySelector(`[data-comment-id="${detail.id}"]`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => setFocusedCommentId(null), 1600);
        }, 40);
      }
    };
    window.addEventListener("orfc:focus-comment", onFocus);
    return () => window.removeEventListener("orfc:focus-comment", onFocus);
  }, []);

  if (!planId) {
    return (
      <Panel>
        <PanelHeader title="Comments" onClose={closeRightPanel} />
        <EmptyState
          title="Not published"
          body="Publish this draft to orfc.dev first (⌘P) to collect comments."
        />
      </Panel>
    );
  }

  const unresolved = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);

  async function handleSubmit() {
    if (!draft.trim() || !planId) return;
    setPosting(true);
    try {
      await addComment(planId, draft.trim());
      setDraft("");
    } finally {
      setPosting(false);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Comments"
        subtitle={planSlug ? `/p/${planSlug}` : undefined}
        onClose={closeRightPanel}
      />

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {commentsLoading && comments.length === 0 && (
          <p className="text-[12px] text-center py-6" style={{ color: "var(--fg-tertiary)" }}>
            Loading comments…
          </p>
        )}

        {commentsError && (
          <p
            className="text-[12px] px-2 py-2 rounded"
            style={{
              background: "var(--danger-soft)",
              border: "1px solid var(--danger-border)",
              color: "var(--danger)",
            }}
          >
            {commentsError}
          </p>
        )}

        {!commentsLoading && comments.length === 0 && !commentsError && (
          <EmptyState
            title="No comments yet"
            body="Reviewers can leave inline comments by selecting text on the published page."
          />
        )}

        {unresolved.map((c) => (
          <CommentCard
            key={c.id}
            comment={c}
            focused={c.id === focusedCommentId}
            onResolve={() => resolveComment(planId, c.id, !c.resolved)}
          />
        ))}

        {resolved.length > 0 && (
          <div className="pt-2 mt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <button
              onClick={() => setShowResolved((v) => !v)}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] font-semibold px-2 py-1 transition-colors"
              style={{ color: "var(--fg-tertiary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-tertiary)")}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: showResolved ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 140ms",
                }}
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
              {resolved.length} resolved
            </button>
            {showResolved && (
              <div className="mt-2 space-y-2">
                {resolved.map((c) => (
                  <CommentCard
                    key={c.id}
                    comment={c}
                    focused={c.id === focusedCommentId}
                    onResolve={() => resolveComment(planId, c.id, !c.resolved)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="px-3 py-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div
          className="flex flex-col gap-2 p-2 rounded-[12px]"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Reply as ${email ?? "you"}…`}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            className="w-full bg-transparent outline-none resize-none text-[12.5px] leading-snug"
            style={{ color: "var(--fg)" }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10.5px]" style={{ color: "var(--fg-tertiary)" }}>
              ⌘↵ to send
            </span>
            <button
              onClick={() => void handleSubmit()}
              disabled={!draft.trim() || posting}
              className="text-[11.5px] font-medium px-2.5 py-1 rounded-[10px] transition-all"
              style={{
                background: draft.trim() ? "var(--fg)" : "var(--bg-sidebar)",
                color: draft.trim() ? "var(--bg)" : "var(--fg-tertiary)",
                cursor: draft.trim() && !posting ? "pointer" : "not-allowed",
                opacity: posting ? 0.6 : 1,
              }}
            >
              {posting ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function CommentCard({
  comment,
  focused,
  onResolve,
}: {
  comment: {
    id: string;
    authorName: string;
    authorEmail: string | null;
    content: string;
    anchorText: string | null;
    resolved: boolean;
    createdAt: string;
  };
  focused: boolean;
  onResolve: () => void;
}) {
  const display = comment.authorEmail || comment.authorName;
  return (
    <div
      data-comment-id={comment.id}
      className="group rounded-[12px] p-2.5 transition-all"
      style={{
        background: focused
          ? "var(--accent-soft)"
          : comment.resolved
          ? "transparent"
          : "var(--bg-surface)",
        border: focused
          ? "1px solid var(--accent)"
          : comment.resolved
          ? "1px dashed var(--border-subtle)"
          : "1px solid var(--border-subtle)",
        boxShadow: focused ? "var(--shadow-glow)" : "none",
      }}
    >
      {comment.anchorText && (
        <div className="flex gap-2 mb-2">
          <span
            className="shrink-0 w-[2px] rounded-full"
            style={{ background: "var(--gold)" }}
          />
          <div
            className="text-[11px] font-sans leading-snug line-clamp-2 italic"
            style={{
              color: comment.resolved ? "var(--muted)" : "var(--fg-secondary)",
            }}
          >
            {comment.anchorText}
          </div>
        </div>
      )}
      <div className="flex items-start gap-2">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-[9.5px] font-bold shrink-0 ${avatarClass(
            display
          )}`}
        >
          {initialsFor(display)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span
              className="text-[12px] font-semibold truncate"
              style={{
                color: comment.resolved ? "var(--muted)" : "var(--fg)",
              }}
            >
              {display}
            </span>
            <span
              className="text-[10px] shrink-0"
              style={{ color: "var(--fg-tertiary)" }}
            >
              {relativeTime(comment.createdAt)}
            </span>
          </div>
          <p
            className="text-[12px] leading-snug whitespace-pre-wrap"
            style={{
              color: comment.resolved
                ? "var(--muted)"
                : "var(--fg-secondary)",
              textDecoration: comment.resolved ? "line-through" : "none",
              textDecorationColor: "var(--muted)",
            }}
          >
            {comment.content}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResolve();
            }}
            className="mt-1.5 text-[10.5px] font-medium transition-colors opacity-0 group-hover:opacity-100"
            style={{ color: "var(--fg-tertiary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--fg-tertiary)")
            }
          >
            {comment.resolved ? "↩ Reopen" : "✓ Resolve"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <aside
      className="h-full flex flex-col shrink-0"
      style={{
        width: 320,
        background: "var(--bg-sidebar)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--panel-radius)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
      }}
    >
      <div data-tauri-drag-region style={{ height: 12, flexShrink: 0 }} />
      {children}
    </aside>
  );
}

function PanelHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div className="flex flex-col min-w-0">
        <h3
          className="text-[12.5px] font-semibold tracking-tight"
          style={{ color: "var(--fg)" }}
        >
          {title}
        </h3>
        {subtitle && (
          <span
            className="text-[10.5px] truncate font-mono"
            style={{ color: "var(--fg-tertiary)" }}
          >
            {subtitle}
          </span>
        )}
      </div>
      <button
        onClick={onClose}
        className="w-6 h-6 flex items-center justify-center rounded transition-colors"
        style={{ color: "var(--fg-tertiary)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-hover)";
          e.currentTarget.style.color = "var(--fg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--fg-tertiary)";
        }}
        title="Close"
        aria-label="Close"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10">
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center mb-3"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--muted)" }}
        >
          <path d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.2 48.2 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.4 48.4 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      </div>
      <p
        className="text-[12.5px] font-medium"
        style={{ color: "var(--fg)" }}
      >
        {title}
      </p>
      <p
        className="text-[11.5px] leading-relaxed mt-1 max-w-[220px]"
        style={{ color: "var(--fg-tertiary)" }}
      >
        {body}
      </p>
    </div>
  );
}
