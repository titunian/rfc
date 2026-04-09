"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { CommentSidebar } from "./comment-sidebar";
import { SelectionPopover } from "./selection-popover";
import { MermaidBlock } from "./mermaid-block";
import { PlanEditor } from "./plan-editor";
import { VersionHistory } from "./version-history";

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
  const lines = markdown.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{1,4})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`~\[\]()#>]/g, "").trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
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
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [selection, setSelection] = useState<{
    text: string;
    rect: DOMRect;
    blockIndex: number;
    offsetStart: number;
    offsetEnd: number;
  } | null>(null);
  const [activeTocId, setActiveTocId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
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
    if (canView) {
      fetchComments();
    }
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

    if (res.ok) {
      setSelection(null);
      window.getSelection()?.removeAllRanges();
      fetchComments();
    }
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

  // Event delegation for clicking on highlighted text
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !canView) return;

    const handleClick = (e: Event) => {
      const target = (e.target as HTMLElement).closest(
        ".comment-anchor"
      ) as HTMLElement;
      if (target?.dataset.commentId) {
        setActiveCommentId((prev) =>
          prev === target.dataset.commentId!
            ? null
            : target.dataset.commentId!
        );
      }
    };

    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, [canView]);

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
      <header className="border-b border-[var(--border-light)] bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-[52px] flex items-center justify-between">
          <a
            href="/"
            className="text-[15px] font-semibold tracking-tight font-sans text-[var(--fg)] hover:text-[var(--fg-secondary)] transition-colors"
          >
            orfc
          </a>
          <div className="flex items-center gap-3">
            {status !== "loading" && !isAuthenticated && (
              <a
                href={`/auth/signin?callbackUrl=/p/${plan.slug}`}
                className="text-[13px] px-3.5 py-1.5 bg-[var(--fg)] text-white rounded-lg hover:bg-gray-800 transition-colors font-sans font-medium"
              >
                Sign in
              </a>
            )}
            {isAuthenticated && (
              <div className="flex items-center gap-2 text-[12px] font-sans text-[var(--muted)]">
                <a
                  href="/dashboard"
                  className="hover:text-[var(--fg)] transition-colors"
                >
                  My docs
                </a>
                <span className="text-gray-300">·</span>
                <span className="truncate max-w-[140px]" title={session.user?.email || undefined}>
                  {session.user?.email}
                </span>
                <span className="text-gray-300">·</span>
                <button
                  onClick={() => signOut({ callbackUrl: `/p/${plan.slug}` })}
                  className="hover:text-[var(--fg)] transition-colors"
                >
                  Log out
                </button>
              </div>
            )}
            {canView && !editing && (
              <div className="flex items-center gap-1.5">
                {isOwner && (
                  <button
                    onClick={() => setEditing(true)}
                    title="Edit document"
                    className="h-8 w-8 rounded-lg border border-[var(--border)] hover:bg-gray-50 transition-colors flex items-center justify-center"
                  >
                    <svg
                      className="w-4 h-4 text-[var(--muted)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
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
                <button
                  onClick={() => {
                    setHistoryOpen(!historyOpen);
                    if (!historyOpen) setSidebarOpen(false);
                  }}
                  title="Version history"
                  className={`h-8 w-8 rounded-lg border border-[var(--border)] hover:bg-gray-50 transition-colors flex items-center justify-center ${
                    historyOpen ? "bg-gray-100" : ""
                  }`}
                >
                  <svg
                    className="w-4 h-4 text-[var(--muted)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setSidebarOpen(!sidebarOpen);
                    if (!sidebarOpen) setHistoryOpen(false);
                  }}
                  title="Comments"
                  className={`h-8 w-8 rounded-lg border border-[var(--border)] hover:bg-gray-50 transition-colors flex items-center justify-center relative ${
                    sidebarOpen ? "bg-gray-100" : ""
                  }`}
                >
                  <svg
                    className="w-4 h-4 text-[var(--muted)]"
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
                  {unresolvedCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center text-[10px] font-semibold bg-[var(--fg)] text-white rounded-full px-1">
                      {unresolvedCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto flex">
        {/* Table of Contents — left sidebar */}
        {showToc && (
          <nav className="w-[220px] shrink-0 sticky top-[53px] h-[calc(100vh-53px)] overflow-y-auto py-8 pl-6 pr-2 hidden lg:block">
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
                    <div className="w-14 h-14 rounded-2xl bg-white border border-[var(--border)] flex items-center justify-center mx-auto mb-5 shadow-sm">
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
                          className="inline-block px-6 py-2.5 bg-[var(--fg)] text-white text-[14px] font-medium rounded-xl hover:bg-gray-800 transition-colors font-sans shadow-sm"
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
                  components={{
                    // Add IDs to headings for TOC navigation
                    h1: ({ children, ...props }) => {
                      const text = getTextContent(children);
                      const id = text
                        .toLowerCase()
                        .replace(/[^\w\s-]/g, "")
                        .replace(/\s+/g, "-");
                      return (
                        <h1 id={id} {...props}>
                          {children}
                        </h1>
                      );
                    },
                    h2: ({ children, ...props }) => {
                      const text = getTextContent(children);
                      const id = text
                        .toLowerCase()
                        .replace(/[^\w\s-]/g, "")
                        .replace(/\s+/g, "-");
                      return (
                        <h2 id={id} {...props}>
                          {children}
                        </h2>
                      );
                    },
                    h3: ({ children, ...props }) => {
                      const text = getTextContent(children);
                      const id = text
                        .toLowerCase()
                        .replace(/[^\w\s-]/g, "")
                        .replace(/\s+/g, "-");
                      return (
                        <h3 id={id} {...props}>
                          {children}
                        </h3>
                      );
                    },
                    h4: ({ children, ...props }) => {
                      const text = getTextContent(children);
                      const id = text
                        .toLowerCase()
                        .replace(/[^\w\s-]/g, "")
                        .replace(/\s+/g, "-");
                      return (
                        <h4 id={id} {...props}>
                          {children}
                        </h4>
                      );
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
                  }}
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
            <div className="fixed right-0 top-[53px] h-[calc(100vh-53px)] z-50 lg:relative lg:top-auto lg:h-auto lg:z-auto">
              <CommentSidebar
                comments={comments}
                activeCommentId={activeCommentId}
                onCommentClick={setActiveCommentId}
                onResolve={handleResolve}
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
            <div className="fixed right-0 top-[53px] h-[calc(100vh-53px)] z-50 lg:relative lg:top-auto lg:h-auto lg:z-auto">
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
