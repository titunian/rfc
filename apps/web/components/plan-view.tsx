"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { CommentSidebar } from "./comment-sidebar";
import { SelectionPopover } from "./selection-popover";
import { MermaidBlock } from "./mermaid-block";

type Plan = {
  id: string;
  slug: string;
  title: string | null;
  content: string;
  authorName: string | null;
  authorEmail: string | null;
  accessRule: string;
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

export function PlanView({ plan }: { plan: Plan }) {
  const { data: session, status } = useSession();
  const isAuthenticated = !!session?.user;
  const isPublic = plan.accessRule === "anyone";
  const canView = isPublic || isAuthenticated;
  const showAuthGate = !canView && status !== "loading";

  const [comments, setComments] = useState<Comment[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [selection, setSelection] = useState<{
    text: string;
    rect: DOMRect;
    blockIndex: number;
    offsetStart: number;
    offsetEnd: number;
  } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

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
    if (canView) {
      document.addEventListener("mouseup", handleTextSelection);
      return () => document.removeEventListener("mouseup", handleTextSelection);
    }
  }, [handleTextSelection, canView]);

  const handleAddComment = async (commentText: string, authorName: string) => {
    if (!selection) return;

    const res = await fetch(`/api/plans/${plan.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: commentText,
        authorName: authorName || "Anonymous",
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
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, resolved: !c.resolved } : c
      )
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-warm)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-lg font-semibold tracking-tight font-sans text-[var(--fg)] hover:text-[var(--fg-secondary)] transition-colors">
              rfc
            </a>
            <span className="text-[var(--border)]">/</span>
            <span className="text-sm text-[var(--muted)] font-sans">
              {plan.authorName || "Anonymous"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {status !== "loading" && !isAuthenticated && (
              <a
                href={`/auth/signin?callbackUrl=/p/${plan.slug}`}
                className="text-sm px-4 py-1.5 bg-[var(--fg)] text-white rounded-lg hover:bg-gray-800 transition-colors font-sans"
              >
                Sign in
              </a>
            )}
            {isAuthenticated && (
              <span className="text-sm text-[var(--muted)] font-sans">
                {session.user?.name || session.user?.email}
              </span>
            )}
            {canView && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-sm px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-gray-50 transition-colors font-sans"
              >
                {sidebarOpen ? "Hide" : "Show"} Comments
                {comments.length > 0 && (
                  <span className="ml-1.5 bg-gray-100 text-[var(--muted)] text-xs px-1.5 py-0.5 rounded-full">
                    {comments.filter((c) => !c.resolved).length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto flex">
        {/* Main content */}
        <main
          className={`flex-1 px-6 py-12 transition-all ${
            sidebarOpen && canView ? "max-w-[calc(100%-380px)]" : ""
          }`}
        >
          {/* Title block — always visible */}
          <div className="max-w-[68ch] mx-auto mb-10">
            <h1 className="text-4xl font-bold tracking-tight font-sans leading-tight mb-3 text-[var(--fg)]">
              {plan.title || "Untitled RFC"}
            </h1>
            <div className="flex items-center gap-2 text-sm text-[var(--muted)] font-sans">
              {plan.authorName && <span>{plan.authorName}</span>}
              {plan.authorName && <span aria-hidden="true">·</span>}
              <time>{formatDate(plan.createdAt)}</time>
            </div>
          </div>

          {/* Content area with auth gating */}
          <div className="max-w-[68ch] mx-auto relative">
            {showAuthGate && (
              <>
                <div className="auth-gate-blur" aria-hidden="true">
                  <div className="prose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {plan.content.slice(0, 800)}
                    </ReactMarkdown>
                  </div>
                </div>

                <div className="auth-gate-overlay">
                  <div className="text-center px-6 py-10 max-w-md">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
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
                          d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                        />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold font-sans mb-2">
                      Sign in to read this RFC
                    </h2>
                    <p className="text-sm text-[var(--muted)] font-sans mb-6">
                      This document requires authentication to view the full content.
                    </p>
                    <a
                      href={`/auth/signin?callbackUrl=/p/${plan.slug}`}
                      className="inline-block px-6 py-2.5 bg-[var(--fg)] text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors font-sans"
                    >
                      Sign in with email
                    </a>
                  </div>
                </div>
              </>
            )}

            {status === "loading" && !isPublic && (
              <div className="py-20 text-center">
                <div className="text-sm text-[var(--muted)] font-sans animate-pulse">
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
                  {plan.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </main>

        {sidebarOpen && canView && (
          <CommentSidebar
            comments={comments}
            activeCommentId={activeCommentId}
            onCommentClick={setActiveCommentId}
            onResolve={handleResolve}
          />
        )}
      </div>

      {canView && selection && (
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
