"use client";

import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { CommentSidebar } from "./comment-sidebar";
import { SelectionPopover } from "./selection-popover";
import { MermaidBlock } from "./mermaid-block";
import { PlanEditor } from "./plan-editor";
import { VersionHistory } from "./version-history";
import { useTheme } from "@/lib/use-theme";

type Plan = {
  id: string;
  slug: string;
  title: string | null;
  content: string;
  authorName: string | null;
  authorEmail: string | null;
  accessRule: string;
  allowedViewers?: string | null;
  currentVersion?: number;
  createdAt: string;
};

type Comment = {
  id: string;
  parentId: string | null;
  authorName: string;
  authorEmail: string | null;
  content: string;
  anchorText: string | null;
  anchorBlockIndex: number | null;
  anchorOffsetStart: number | null;
  anchorOffsetEnd: number | null;
  resolved: boolean;
  createdAt: string;
};

type TocItem = {
  id: string;
  text: string;
  level: number;
};

function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const idCounts: Record<string, number> = {};
  const lines = markdown.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{1,4})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`~\[\]()#>]/g, "").trim();
      let id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      // Deduplicate: "subagents" → "subagents", "subagents-1", "subagents-2"
      const count = idCounts[id] ?? 0;
      idCounts[id] = count + 1;
      if (count > 0) id = `${id}-${count}`;
      items.push({ id, text, level });
    }
  }
  return items;
}

export function PlanView({
  plan: initialPlan,
  serverAuthed,
  isOwner = false,
}: {
  plan: Plan;
  serverAuthed: boolean;
  isOwner?: boolean;
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [editing, setEditing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<{
    content: string;
    version: number;
    title: string | null;
    versionId: string;
  } | null>(null);
  const { data: session, status } = useSession();
  const isAuthenticated = !!session?.user;
  const isPublic = plan.accessRule === "anyone";
  const canView = serverAuthed && (isPublic || isAuthenticated);
  const showAuthGate = !serverAuthed && status !== "loading";

  const [comments, setComments] = useState<Comment[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [selection, setSelection] = useState<{
    text: string;
    rect: DOMRect;
    blockIndex: number;
    offsetStart: number;
    offsetEnd: number;
  } | null>(null);
  const [activeTocId, setActiveTocId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { theme, toggleTheme, mounted: themeMounted } = useTheme();
  const contentRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Focus mode — hide chrome, add body class, ESC to exit
  useEffect(() => {
    if (focusMode) {
      document.body.classList.add("focus-mode");
      setSidebarOpen(false);
      setHistoryOpen(false);
    } else {
      document.body.classList.remove("focus-mode");
    }
    return () => {
      document.body.classList.remove("focus-mode");
    };
  }, [focusMode]);

  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode]);

  // Close user menu on outside click / ESC
  useEffect(() => {
    if (!userMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(t)) {
        setUserMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [userMenuOpen]);
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);

  // Always fetch fresh content on mount — server render may be cached/stale
  useEffect(() => {
    async function refreshPlan() {
      const res = await fetch(`/api/plans/${initialPlan.id}`);
      if (res.ok) {
        const data = await res.json();
        const fresh = data.content ? data : data.plan;
        if (fresh && fresh.content) {
          setPlan((prev) => ({ ...prev, ...fresh }));
        }
      }
    }
    refreshPlan();
  }, [initialPlan.id]);

  // Poll for new versions every 30s — show a toast if the doc was updated
  useEffect(() => {
    if (!canView) return;
    let lastKnownVersion = plan.currentVersion ?? 0;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/plans/${plan.id}/versions`);
        if (!res.ok) return;
        const data = await res.json();
        const latest = data.currentVersion ?? 0;
        if (latest > lastKnownVersion && lastKnownVersion > 0) {
          setNewVersionAvailable(true);
        }
        lastKnownVersion = latest;
      } catch {
        // silent — don't disrupt reading
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [plan.id, plan.currentVersion, canView]);

  // When version history reports a newer version, re-fetch
  const handleVersionChange = useCallback(
    async (version: number) => {
      const res = await fetch(`/api/plans/${plan.id}`);
      if (res.ok) {
        const data = await res.json();
        const fresh = data.content ? data : data.plan;
        if (fresh && fresh.content) {
          setPlan((prev) => ({ ...prev, ...fresh }));
        }
      }
    },
    [plan.id]
  );

  // Strip first H1 from content if it matches plan title (avoids double title)
  const activeTitle = previewVersion ? previewVersion.title : plan.title;
  const displayContent = useMemo(() => {
    const content = previewVersion ? previewVersion.content : plan.content;
    const title = previewVersion ? previewVersion.title : plan.title;
    if (!title || !content) return content;
    const match = content.match(/^#\s+(.+?)(?:\n|$)/);
    if (match && match[1].trim() === title.trim()) {
      return content.replace(/^#[^\n]+\n?/, "").trimStart();
    }
    return content;
  }, [plan.content, plan.title, previewVersion]);

  // Extract TOC from content
  const toc = useMemo(() => extractToc(displayContent), [displayContent]);

  // TOC scroll spy
  useEffect(() => {
    if (!canView || toc.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveTocId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    // Wait for headings to render with IDs
    const timer = setTimeout(() => {
      for (const item of toc) {
        const el = document.getElementById(item.id);
        if (el) observer.observe(el);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [toc, canView]);

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/plans/${plan.id}/comments`);
    if (res.ok) {
      const data = await res.json();
      setComments(data.comments);
    }
  }, [plan.id]);

  useEffect(() => {
    if (!canView) return;
    fetchComments();

    // Poll for new comments every 15s — shows them in real time without
    // requiring a page refresh. Lightweight: just a GET on the comments
    // endpoint, same as the initial load.
    const interval = setInterval(fetchComments, 15_000);
    return () => clearInterval(interval);
  }, [fetchComments, canView]);

  const handleTextSelection = useCallback((e: MouseEvent) => {
    if (popoverRef.current?.contains(e.target as Node)) {
      return;
    }

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setSelection(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text || text.length < 3) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    let blockIndex = 0;
    let node: Node | null = range.startContainer;
    while (node && node !== contentRef.current) {
      if (
        node.parentNode === contentRef.current &&
        node.nodeType === Node.ELEMENT_NODE
      ) {
        const children = Array.from(contentRef.current?.children || []);
        blockIndex = children.indexOf(node as Element);
        break;
      }
      node = node.parentNode;
    }

    setSelection({
      text,
      rect,
      blockIndex,
      offsetStart: range.startOffset,
      offsetEnd: range.endOffset,
    });
  }, []);

  useEffect(() => {
    if (canView && !editing) {
      document.addEventListener("mouseup", handleTextSelection);
      return () => document.removeEventListener("mouseup", handleTextSelection);
    }
  }, [handleTextSelection, canView, editing]);

  const handleReply = async (parentId: string, content: string) => {
    const res = await fetch(`/api/plans/${plan.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId }),
    });
    if (!res.ok) throw new Error("Failed to post reply");
    fetchComments();
  };

  const handleAddComment = async (commentText: string) => {
    if (!selection) return;

    const res = await fetch(`/api/plans/${plan.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: commentText,
        anchorText: selection.text,
        anchorBlockIndex: selection.blockIndex,
        anchorOffsetStart: selection.offsetStart,
        anchorOffsetEnd: selection.offsetEnd,
      }),
    });

    if (!res.ok) throw new Error("Failed to post comment");

    setSelection(null);
    window.getSelection()?.removeAllRanges();
    fetchComments();
  };

  const handleResolve = async (commentId: string) => {
    const target = comments.find((c) => c.id === commentId);
    if (!target) return;
    const next = !target.resolved;

    // Optimistic update
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, resolved: next } : c))
    );

    const res = await fetch(
      `/api/plans/${plan.id}/comments/${commentId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: next }),
      }
    );

    if (!res.ok) {
      // Roll back on failure
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, resolved: !next } : c
        )
      );
    }
  };

  // ── Inline comment highlighting ──────────────────────────────
  const applyHighlights = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;

    // Remove existing highlights
    el.querySelectorAll(".comment-anchor").forEach((span) => {
      const parent = span.parentNode;
      if (parent) {
        while (span.firstChild) {
          parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
        parent.normalize();
      }
    });

    // Apply highlights for unresolved comments with anchor text
    const toHighlight = comments.filter((c) => !c.resolved && c.anchorText);

    for (const comment of toHighlight) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          let p = node.parentElement;
          while (p && p !== el) {
            if (
              p.tagName === "PRE" ||
              p.tagName === "CODE" ||
              p.classList.contains("comment-anchor")
            ) {
              return NodeFilter.FILTER_REJECT;
            }
            p = p.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      let textNode: Node | null;
      let found = false;
      while ((textNode = walker.nextNode()) && !found) {
        const text = textNode.textContent || "";
        const idx = text.indexOf(comment.anchorText!);
        if (idx !== -1) {
          try {
            const range = document.createRange();
            range.setStart(textNode, idx);
            range.setEnd(textNode, idx + comment.anchorText!.length);

            const span = document.createElement("span");
            span.className = `comment-anchor${comment.id === activeCommentId ? " active" : ""}`;
            span.dataset.commentId = comment.id;

            range.surroundContents(span);
            found = true;
          } catch {
            // surroundContents can fail if range crosses element boundaries
          }
        }
      }
    }
  }, [comments, activeCommentId]);

  useEffect(() => {
    if (canView) {
      const timeout = setTimeout(applyHighlights, 80);
      return () => clearTimeout(timeout);
    }
  }, [applyHighlights, canView]);

  // Event delegation for clicking on highlighted text → scroll to comment
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !canView) return;

    const handleClick = (e: Event) => {
      const target = (e.target as HTMLElement).closest(
        ".comment-anchor"
      ) as HTMLElement;
      if (target?.dataset.commentId) {
        const id = target.dataset.commentId!;
        setActiveCommentId((prev) => (prev === id ? null : id));
        // Open sidebar if not open, and scroll to the comment card
        if (!sidebarOpen) setSidebarOpen(true);
        setTimeout(() => {
          const card = document.querySelector(`[data-comment-id="${id}"]`);
          card?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    };

    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, [canView, sidebarOpen]);

  // When a comment is clicked in the sidebar → scroll to its highlight in the doc
  useEffect(() => {
    if (!activeCommentId || !contentRef.current) return;
    const highlight = contentRef.current.querySelector(
      `.comment-anchor[data-comment-id="${activeCommentId}"]`
    );
    if (highlight) {
      highlight.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeCommentId]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const unresolvedCount = comments.filter((c) => !c.resolved).length;
  const authorDisplay = plan.authorEmail || plan.authorName;
  const showToc = canView && toc.length > 2;

  return (
    <div className="min-h-screen bg-[var(--bg-warm)]">
      {/* Header */}
      <header
        data-chrome
        className="border-b border-[var(--border-light)] sticky top-0 z-40"
        style={{
          background: "var(--header-bg)",
          backdropFilter: "saturate(180%) blur(14px)",
          WebkitBackdropFilter: "saturate(180%) blur(14px)",
        }}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-[56px] flex items-center justify-between gap-4">
          {/* Brand */}
          <a
            href="/"
            className="group flex items-center gap-2 shrink-0"
            aria-label="orfc home"
          >
            <span
              className="inline-flex items-center justify-center h-6 w-6 rounded-[7px] bg-[var(--fg)] text-[var(--bg)] text-[11px] font-bold tracking-tight shadow-sm group-hover:scale-105 transition-transform"
              aria-hidden="true"
            >
              o
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.01em] font-sans text-[var(--fg)] group-hover:text-[var(--fg-secondary)] transition-colors">
              orfc
            </span>
          </a>

          {/* Right cluster */}
          <div className="flex items-center gap-2 min-w-0">
            {status !== "loading" && !isAuthenticated && (
              <a
                href={`/auth/signin?callbackUrl=/p/${plan.slug}`}
                className="text-[13px] px-3.5 py-1.5 bg-[var(--fg)] text-[var(--bg)] rounded-lg hover:opacity-90 transition-opacity font-sans font-medium"
              >
                Sign in
              </a>
            )}

            {/* Icon button cluster */}
            {canView && !editing && (
              <div className="flex items-center gap-0.5">
                {isOwner && (
                  <button
                    onClick={() => setEditing(true)}
                    title="Edit document"
                    aria-label="Edit document"
                    className="h-8 w-8 rounded-lg text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--button-hover)] transition-colors flex items-center justify-center"
                  >
                    <svg
                      className="w-[15px] h-[15px]"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.7}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                      />
                    </svg>
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    title="Permissions & settings"
                    aria-label="Permissions & settings"
                    className={`h-8 w-8 rounded-lg transition-colors flex items-center justify-center ${
                      settingsOpen
                        ? "bg-[var(--button-hover)] text-[var(--fg)]"
                        : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--button-hover)]"
                    }`}
                  >
                    <svg
                      className="w-[15px] h-[15px]"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.7}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </button>
                )}

                {/* Focus mode (direct) */}
                <button
                  onClick={() => setFocusMode(true)}
                  title="Focus mode (Esc to exit)"
                  aria-label="Enter focus mode"
                  className="h-8 w-8 rounded-lg text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--button-hover)] transition-colors flex items-center justify-center"
                >
                  <svg
                    className="w-[15px] h-[15px]"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.7}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                    />
                  </svg>
                </button>

                {/* Version history (direct) */}
                <button
                  onClick={() => {
                    setHistoryOpen(!historyOpen);
                    if (!historyOpen) setSidebarOpen(false);
                  }}
                  title="Version history"
                  aria-label="Version history"
                  className={`h-8 w-8 rounded-lg transition-colors flex items-center justify-center ${
                    historyOpen
                      ? "bg-[var(--button-hover)] text-[var(--fg)]"
                      : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--button-hover)]"
                  }`}
                >
                  <svg
                    className="w-[15px] h-[15px]"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.7}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>

                {/* Comments */}
                <button
                  onClick={() => {
                    setSidebarOpen(!sidebarOpen);
                    if (!sidebarOpen) setHistoryOpen(false);
                  }}
                  title="Comments"
                  aria-label="Comments"
                  className={`h-8 w-8 rounded-lg transition-colors flex items-center justify-center relative ${
                    sidebarOpen
                      ? "bg-[var(--button-hover)] text-[var(--fg)]"
                      : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--button-hover)]"
                  }`}
                >
                  <svg
                    className="w-[15px] h-[15px]"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.7}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                    />
                  </svg>
                  {unresolvedCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center text-[10px] font-semibold bg-[var(--accent)] text-white rounded-full px-1 ring-2 ring-[var(--bg-warm)]">
                      {unresolvedCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* User avatar menu */}
            {isAuthenticated && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  title={session.user?.email || "Account"}
                  aria-label="Account menu"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  className={`h-8 w-8 rounded-full text-[12px] font-semibold font-sans flex items-center justify-center transition-colors ${
                    userMenuOpen
                      ? "bg-[var(--fg)] text-[var(--bg)]"
                      : "bg-[var(--button-hover)] text-[var(--fg-secondary)] hover:bg-[var(--border-light)] hover:text-[var(--fg)]"
                  }`}
                >
                  {(session.user?.email || "?").trim().charAt(0).toUpperCase()}
                </button>
                {userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[38px] w-60 rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-[0_8px_24px_rgba(0,0,0,0.08)] py-1 z-50 font-sans"
                  >
                    <div className="px-3 py-2 border-b border-[var(--border-light)]">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-medium">
                        Signed in as
                      </div>
                      <div
                        className="text-[12.5px] text-[var(--fg-secondary)] font-medium truncate mt-0.5"
                        title={session.user?.email || undefined}
                      >
                        {session.user?.email}
                      </div>
                    </div>
                    <a
                      href="/dashboard"
                      role="menuitem"
                      className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--fg-secondary)] hover:bg-[var(--button-hover)] hover:text-[var(--fg)] transition-colors"
                    >
                      <svg
                        className="w-4 h-4 text-[var(--muted)]"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.7}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                        />
                      </svg>
                      My docs
                    </a>
                    <button
                      role="menuitem"
                      onClick={() => toggleTheme()}
                      className="w-full text-left flex items-center justify-between gap-2.5 px-3 py-2 text-[13px] text-[var(--fg-secondary)] hover:bg-[var(--button-hover)] hover:text-[var(--fg)] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        {themeMounted && theme === "dark" ? (
                          <svg
                            className="w-4 h-4 text-[var(--muted)]"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.7}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4 text-[var(--muted)]"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.7}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                            />
                          </svg>
                        )}
                        Appearance
                      </div>
                      <span className="text-[11px] text-[var(--muted)] font-medium">
                        {themeMounted ? (theme === "dark" ? "Dark" : "Light") : ""}
                      </span>
                    </button>
                    <div className="h-px bg-[var(--border-light)] my-1" />
                    <button
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut({ callbackUrl: `/p/${plan.slug}` });
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--fg-secondary)] hover:bg-[var(--button-hover)] hover:text-[var(--fg)] transition-colors"
                    >
                      <svg
                        className="w-4 h-4 text-[var(--muted)]"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.7}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                        />
                      </svg>
                      Log out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Permissions modal (owner only) */}
      {settingsOpen && isOwner && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
          onClick={() => setSettingsOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <PermissionsPanel
              plan={plan}
              onUpdate={(updates) => {
                setPlan((p) => ({ ...p, ...updates }));
              }}
              onClose={() => setSettingsOpen(false)}
            />
          </div>
        </div>
      )}

      {/* New version toast */}
      {newVersionAvailable && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl font-sans shadow-lg"
          style={{
            background: "var(--fg)",
            color: "var(--bg)",
            animation: "slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
            />
          </svg>
          <span className="text-[13px] font-medium">
            A new version of this document is available
          </span>
          <button
            onClick={() => {
              setNewVersionAvailable(false);
              window.location.reload();
            }}
            className="text-[12px] font-semibold px-3 py-1 rounded-lg transition-colors"
            style={{
              background: "var(--bg)",
              color: "var(--fg)",
            }}
          >
            Refresh
          </button>
          <button
            onClick={() => setNewVersionAvailable(false)}
            className="text-[12px] opacity-60 hover:opacity-100 transition-opacity"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Focus-mode exit button (floating) */}
      {focusMode && (
        <button
          onClick={() => setFocusMode(false)}
          title="Exit focus mode (Esc)"
          aria-label="Exit focus mode"
          className="fixed top-4 right-4 z-50 h-9 px-3 rounded-lg text-[12px] font-sans font-medium text-[var(--muted)] hover:text-[var(--fg)] bg-[var(--bg)] border border-[var(--border)] hover:bg-[var(--button-hover)] transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l6 6m0-6l-6 6" />
          </svg>
          Exit focus
        </button>
      )}

      <div className="max-w-[1400px] mx-auto flex">
        {/* Table of Contents — left sidebar */}
        {showToc && (
          <nav
            data-chrome
            className="w-[220px] shrink-0 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto py-8 pl-6 pr-2 hidden lg:block"
          >
            <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--muted)] font-sans font-medium mb-3">
              On this page
            </p>
            <ul className="space-y-0.5">
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.getElementById(item.id);
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "start" });
                        setActiveTocId(item.id);
                      }
                    }}
                    className={`block text-[12px] font-sans py-1 transition-colors leading-snug truncate ${
                      item.level === 1 ? "pl-0 font-medium" : ""
                    }${item.level === 2 ? "pl-0" : ""}${
                      item.level === 3 ? "pl-3" : ""
                    }${item.level === 4 ? "pl-6" : ""} ${
                      activeTocId === item.id
                        ? "text-[var(--fg)] font-medium"
                        : "text-[var(--muted)] hover:text-[var(--fg-secondary)]"
                    }`}
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Main content */}
        <main
          className={`flex-1 px-4 sm:px-6 py-10 transition-all min-w-0 ${
            (sidebarOpen || historyOpen) && canView && !editing ? "lg:max-w-[calc(100%-340px)]" : ""
          }`}
        >
          {/* Editor mode */}
          {editing && canView && (
            <PlanEditor
              plan={plan}
              onSave={(newContent, newTitle) => {
                setPlan({ ...plan, content: newContent, title: newTitle || plan.title });
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          )}

          {/* Read mode */}
          {!editing && (
          <>
          {/* Version preview banner */}
          {previewVersion && (
            <div className="max-w-[68ch] mx-auto mb-4">
              <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[13px] font-sans text-amber-800">
                    Viewing <span className="font-semibold">v{previewVersion.version}</span>
                    {previewVersion.title && <span className="text-amber-600"> — {previewVersion.title}</span>}
                  </span>
                </div>
                <button
                  onClick={() => setPreviewVersion(null)}
                  className="text-[12px] font-sans font-medium text-amber-700 hover:text-amber-900 px-2.5 py-1 rounded-md hover:bg-amber-100 transition-colors"
                >
                  Back to current
                </button>
              </div>
            </div>
          )}

          {/* Title block */}
          <div className="max-w-[68ch] mx-auto mb-6">
            <h1 className="text-[1.25rem] sm:text-[1.5rem] font-semibold tracking-[-0.02em] font-sans leading-[1.3] mb-2 text-[var(--fg)]">
              {activeTitle || "Untitled"}
            </h1>
            {!previewVersion && (
            <div className="flex items-center gap-2 text-[12px] text-[var(--muted)] font-sans">
              {authorDisplay && (
                <span className="font-medium text-[var(--fg-secondary)]">
                  {authorDisplay}
                </span>
              )}
              {authorDisplay && (
                <span className="text-[var(--border)]" aria-hidden="true">
                  ·
                </span>
              )}
              <time>{formatDate(plan.createdAt)}</time>
            </div>
            )}
          </div>

          {/* Content area with auth gating */}
          <div className="max-w-[68ch] mx-auto relative">
            {showAuthGate && (
              <div className="relative">
                {/* Blurred preview — only shows truncated server content */}
                <div
                  className="select-none pointer-events-none"
                  aria-hidden="true"
                  style={{
                    filter: "blur(5px)",
                    WebkitFilter: "blur(5px)",
                    maskImage:
                      "linear-gradient(to bottom, black 0%, transparent 80%)",
                    WebkitMaskImage:
                      "linear-gradient(to bottom, black 0%, transparent 80%)",
                    maxHeight: "300px",
                    overflow: "hidden",
                  }}
                >
                  <div className="prose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {plan.content}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Overlay — differentiate signed-in-no-access vs not-signed-in */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="text-center px-6 py-10 max-w-md">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center mx-auto mb-5 shadow-sm">
                      <svg
                        className="w-6 h-6 text-[var(--fg)]"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        {isAuthenticated ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                          />
                        )}
                      </svg>
                    </div>
                    {isAuthenticated ? (
                      <>
                        <h2 className="text-[18px] font-semibold font-sans mb-2 text-[var(--fg)]">
                          You don&apos;t have access
                        </h2>
                        <p className="text-[14px] text-[var(--muted)] font-sans mb-2 leading-relaxed">
                          This document is restricted. Your account
                          ({session?.user?.email}) is not in the allowed viewers list.
                        </p>
                        <p className="text-[13px] text-[var(--muted)] font-sans leading-relaxed">
                          Contact the author to request access.
                        </p>
                      </>
                    ) : (
                      <>
                        <h2 className="text-[18px] font-semibold font-sans mb-2 text-[var(--fg)]">
                          Sign in to continue reading
                        </h2>
                        <p className="text-[14px] text-[var(--muted)] font-sans mb-6 leading-relaxed">
                          This document requires authentication to view.
                        </p>
                        <a
                          href={`/auth/signin?callbackUrl=/p/${plan.slug}`}
                          className="inline-block px-6 py-2.5 bg-[var(--fg)] text-[var(--bg)] text-[14px] font-medium rounded-xl hover:opacity-90 transition-opacity font-sans shadow-sm"
                        >
                          Sign in with email
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {status === "loading" && !isPublic && !serverAuthed && (
              <div className="py-20 text-center">
                <div className="text-[14px] text-[var(--muted)] font-sans animate-pulse">
                  Loading…
                </div>
              </div>
            )}

            {canView && (
              <div ref={contentRef} className="prose">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={(() => {
                    // Shared counter to deduplicate heading IDs across the
                    // entire document (e.g. two "## Subagents" get
                    // id="subagents" and id="subagents-1").
                    const idCounts: Record<string, number> = {};
                    function makeId(text: string): string {
                      let id = text
                        .toLowerCase()
                        .replace(/[^\w\s-]/g, "")
                        .replace(/\s+/g, "-");
                      const count = idCounts[id] ?? 0;
                      idCounts[id] = count + 1;
                      if (count > 0) id = `${id}-${count}`;
                      return id;
                    }
                    return {
                    h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { children?: ReactNode }) => {
                      const id = makeId(getTextContent(children));
                      return <h1 id={id} {...props}>{children}</h1>;
                    },
                    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { children?: ReactNode }) => {
                      const id = makeId(getTextContent(children));
                      return <h2 id={id} {...props}>{children}</h2>;
                    },
                    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { children?: ReactNode }) => {
                      const id = makeId(getTextContent(children));
                      return <h3 id={id} {...props}>{children}</h3>;
                    },
                    h4: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { children?: ReactNode }) => {
                      const id = makeId(getTextContent(children));
                      return <h4 id={id} {...props}>{children}</h4>;
                    },
                    code(props) {
                      const { className, children, ...rest } = props;
                      const match = /language-(\w+)/.exec(className || "");
                      const lang = match ? match[1] : null;

                      if (lang === "mermaid") {
                        return (
                          <MermaidBlock
                            chart={String(children).replace(/\n$/, "")}
                          />
                        );
                      }

                      return (
                        <code className={className} {...rest}>
                          {children}
                        </code>
                      );
                    },
                    pre(props) {
                      const { children, ...rest } = props;
                      const child = Array.isArray(children)
                        ? children[0]
                        : children;
                      if (
                        child &&
                        typeof child === "object" &&
                        "type" in child &&
                        (child as React.ReactElement).type === MermaidBlock
                      ) {
                        return <>{children}</>;
                      }
                      return <pre {...rest}>{children}</pre>;
                    },
                  };
                  })()}
                >
                  {displayContent}
                </ReactMarkdown>
              </div>
            )}
          </div>
          </>
          )}
        </main>

        {sidebarOpen && canView && !editing && (
          <>
            {/* Mobile overlay backdrop */}
            <div
              className="fixed inset-0 bg-black/20 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed right-0 top-[57px] h-[calc(100vh-57px)] z-50 lg:relative lg:top-auto lg:h-auto lg:z-auto">
              <CommentSidebar
                comments={comments}
                activeCommentId={activeCommentId}
                onCommentClick={setActiveCommentId}
                onResolve={handleResolve}
                onReply={handleReply}
              />
            </div>
          </>
        )}

        {historyOpen && canView && !editing && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-40 lg:hidden"
              onClick={() => setHistoryOpen(false)}
            />
            <div className="fixed right-0 top-[57px] h-[calc(100vh-57px)] z-50 lg:relative lg:top-auto lg:h-auto lg:z-auto">
              <VersionHistory
                planId={plan.id}
                onClose={() => {
                  setHistoryOpen(false);
                  setPreviewVersion(null);
                }}
                onVersionChange={handleVersionChange}
                onPreviewVersion={(content, version, title, versionId) => {
                  setPreviewVersion({ content, version, title, versionId });
                }}
                onClearPreview={() => setPreviewVersion(null)}
                previewingVersionId={previewVersion?.versionId || null}
              />
            </div>
          </>
        )}
      </div>

      {canView && !editing && selection && (
        <div ref={popoverRef}>
          <SelectionPopover
            rect={selection.rect}
            onComment={handleAddComment}
            onDismiss={() => setSelection(null)}
          />
        </div>
      )}
    </div>
  );
}

// ── Permissions panel ───────────────────────────────────────────────

function PermissionsPanel({
  plan,
  onUpdate,
  onClose,
}: {
  plan: Plan;
  onUpdate: (updates: Partial<Plan>) => void;
  onClose: () => void;
}) {
  const [accessRule, setAccessRule] = useState(plan.accessRule);
  const [allowedViewers, setAllowedViewers] = useState(
    plan.allowedViewers || ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dirty =
    accessRule !== plan.accessRule ||
    allowedViewers !== (plan.allowedViewers || "");

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessRule,
          allowedViewers: accessRule === "anyone" ? null : allowedViewers || null,
        }),
      });
      if (res.ok) {
        onUpdate({
          accessRule,
          allowedViewers:
            accessRule === "anyone" ? null : allowedViewers || null,
        });
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          onClose();
        }, 800);
      } else {
        const data = await res.json().catch(() => ({}));
        setSaveError((data as { error?: string }).error || `Failed to save (${res.status})`);
      }
    } catch {
      setSaveError("Network error — could not save permissions");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-2xl bg-[var(--bg)] font-sans animate-in fade-in zoom-in-95"
      style={{
        width: 480,
        maxWidth: "calc(100vw - 32px)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--border-light)]">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--fg)] tracking-tight">
            Sharing & permissions
          </h3>
          <p className="text-[12px] text-[var(--muted)] mt-0.5">
            Control who can view this document
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--button-hover)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Access rule — radio-style list instead of cards */}
        <div className="space-y-1.5">
          <AccessRow
            active={accessRule === "anyone"}
            onClick={() => setAccessRule("anyone")}
            label="Anyone with the link"
            description="Public — no sign-in required"
            icon={
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
            }
          />
          <AccessRow
            active={accessRule === "authenticated"}
            onClick={() => setAccessRule("authenticated")}
            label="Anyone signed in"
            description="Requires an orfc account"
            icon={
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            }
          />
          <AccessRow
            active={accessRule !== "anyone" && accessRule !== "authenticated"}
            onClick={() => setAccessRule("allowlist")}
            label="Only specific people"
            description="Restrict to an email allowlist"
            icon={
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            }
          />
        </div>

        {/* Allowed viewers */}
        {accessRule !== "anyone" && accessRule !== "authenticated" && (
          <div>
            <textarea
              value={allowedViewers}
              onChange={(e) => setAllowedViewers(e.target.value)}
              placeholder="alice@company.com, @company.com"
              rows={2}
              className="w-full text-[13px] font-mono bg-[var(--bg-warm)] text-[var(--fg)] placeholder:text-[var(--muted)] border border-[var(--border-light)] rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-shadow"
            />
            <p className="text-[11px] text-[var(--muted)] mt-1.5 leading-relaxed px-0.5">
              Comma-separated emails or <code className="bg-[var(--code-inline-bg)] px-1 py-0.5 rounded text-[10px] border border-[var(--border-light)]">@domain.com</code> patterns. Author always has access.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {saveError && (
        <div className="mx-6 mb-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[12px] font-sans">
          {saveError}
        </div>
      )}
      <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-light)] bg-[var(--bg-warm)] rounded-b-2xl">
        <span className="text-[11.5px] text-[var(--muted)]">
          {saved
            ? "Saved"
            : plan.accessRule === "anyone"
            ? "Currently public"
            : plan.allowedViewers
            ? (() => {
                const entries = plan.allowedViewers!.split(",").map((s: string) => s.trim()).filter(Boolean);
                const domains = entries.filter((e: string) => e.startsWith("@")).length;
                const emails = entries.length - domains;
                const parts: string[] = [];
                if (domains > 0) parts.push(`${domains} domain${domains > 1 ? "s" : ""}`);
                if (emails > 0) parts.push(`${emails} email${emails > 1 ? "s" : ""}`);
                return parts.join(", ");
              })()
            : "Signed-in users only"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg text-[var(--fg-secondary)] hover:bg-[var(--button-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="text-[12.5px] font-medium px-4 py-1.5 rounded-lg transition-all"
            style={{
              background: dirty && !saving ? "var(--fg)" : "var(--border-light)",
              color: dirty && !saving ? "var(--bg)" : "var(--muted)",
              cursor: dirty && !saving ? "pointer" : "not-allowed",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccessRow({
  active,
  onClick,
  label,
  description,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl border transition-all text-left ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-light)]"
          : "border-transparent hover:bg-[var(--button-hover)]"
      }`}
    >
      <span
        className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
          active
            ? "bg-[var(--accent)] text-white"
            : "bg-[var(--border-light)] text-[var(--muted)]"
        }`}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <span
          className={`block text-[13px] font-semibold ${
            active ? "text-[var(--accent)]" : "text-[var(--fg)]"
          }`}
        >
          {label}
        </span>
        <span className="block text-[11.5px] text-[var(--muted)] leading-snug mt-0.5">
          {description}
        </span>
      </div>
      <span
        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          active
            ? "border-[var(--accent)]"
            : "border-[var(--border)]"
        }`}
      >
        {active && (
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
        )}
      </span>
    </button>
  );
}

// Helper to extract plain text from React children
function getTextContent(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(getTextContent).join("");
  if (children && typeof children === "object" && "props" in children) {
    return getTextContent((children as React.ReactElement).props.children);
  }
  return "";
}
