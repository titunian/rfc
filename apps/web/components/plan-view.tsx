"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CommentSidebar } from "./comment-sidebar";
import { SelectionPopover } from "./selection-popover";

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
    fetchComments();
  }, [fetchComments]);

  const handleTextSelection = useCallback((e: MouseEvent) => {
    // Don't clear selection when clicking inside the comment popover
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

    // Find which block the selection is in
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
    document.addEventListener("mouseup", handleTextSelection);
    return () => document.removeEventListener("mouseup", handleTextSelection);
  }, [handleTextSelection]);

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
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-white sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold tracking-tight">rfc</span>
            <span className="text-[var(--muted)] text-sm">/</span>
            <span className="text-sm text-[var(--muted)]">
              {plan.authorName || "Anonymous"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-sm px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-gray-50 transition-colors"
            >
              {sidebarOpen ? "Hide" : "Show"} Comments
              {comments.length > 0 && (
                <span className="ml-1.5 bg-gray-100 text-[var(--muted)] text-xs px-1.5 py-0.5 rounded-full">
                  {comments.filter((c) => !c.resolved).length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto flex">
        {/* Main content */}
        <main
          className={`flex-1 px-6 py-10 transition-all ${
            sidebarOpen ? "max-w-[calc(100%-380px)]" : ""
          }`}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {plan.title || "Untitled RFC"}
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {plan.authorName && <span>by {plan.authorName}</span>}
              {plan.authorName && " · "}
              {formatDate(plan.createdAt)}
            </p>
          </div>

          <div ref={contentRef} className="prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {plan.content}
            </ReactMarkdown>
          </div>
        </main>

        {sidebarOpen && (
          <CommentSidebar
            comments={comments}
            activeCommentId={activeCommentId}
            onCommentClick={setActiveCommentId}
            onResolve={handleResolve}
          />
        )}
      </div>

      {selection && (
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
