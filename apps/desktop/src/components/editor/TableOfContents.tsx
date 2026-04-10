import { useEffect, useState, useCallback, useRef } from "react";
import { useAppStore } from "../../stores/app-store";
import type { Editor } from "@tiptap/react";

interface TocItem {
  id: string;
  text: string;
  level: number;
  pos: number;
}

function extractHeadings(editor: Editor): TocItem[] {
  const items: TocItem[] = [];
  const doc = editor.state.doc;
  doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      const level = node.attrs.level as number;
      if (level >= 1 && level <= 4) {
        const text = node.textContent.trim();
        if (text) {
          items.push({
            id: `toc-${pos}`,
            text,
            level,
            pos,
          });
        }
      }
    }
  });
  return items;
}

const INDENT: Record<number, number> = { 1: 0, 2: 0, 3: 12, 4: 24 };
const MIN_HEADINGS = 3;

interface TableOfContentsProps {
  editor: Editor | null;
}

export function TableOfContents({ editor }: TableOfContentsProps) {
  const tocVisible = useAppStore((s) => s.tocVisible);
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activePos, setActivePos] = useState<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const refreshHeadings = useCallback(() => {
    if (!editor) return;
    setHeadings(extractHeadings(editor));
  }, [editor]);

  // Extract headings on mount and every editor update.
  useEffect(() => {
    if (!editor) return;
    refreshHeadings();
    editor.on("update", refreshHeadings);
    return () => {
      editor.off("update", refreshHeadings);
    };
  }, [editor, refreshHeadings]);

  // IntersectionObserver to track which heading is "active" (first visible).
  useEffect(() => {
    if (!editor || headings.length < MIN_HEADINGS) return;

    // Find the editor scroll container — the <main> parent.
    const editorDom = editor.view.dom;
    const scrollContainer = editorDom.closest("main");
    if (!scrollContainer) return;

    // Collect heading DOM elements by matching their position in the doc.
    const headingEls: { el: Element; pos: number }[] = [];
    const proseMirror = editorDom;
    const domHeadings = proseMirror.querySelectorAll("h1, h2, h3, h4");
    // Map them back to TocItems by index order (headings in DOM are in document order).
    domHeadings.forEach((el, i) => {
      if (i < headings.length) {
        headingEls.push({ el, pos: headings[i].pos });
      }
    });

    // Clean up old observer.
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const visibleSet = new Map<number, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const match = headingEls.find((h) => h.el === entry.target);
          if (match) {
            visibleSet.set(match.pos, entry.isIntersecting);
          }
        }
        // Pick the first heading (by document order) that is visible.
        for (const { pos } of headingEls) {
          if (visibleSet.get(pos)) {
            setActivePos(pos);
            return;
          }
        }
      },
      {
        root: scrollContainer,
        rootMargin: "-60px 0px -60% 0px",
        threshold: 0,
      }
    );

    for (const { el } of headingEls) {
      observer.observe(el);
    }
    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [editor, headings]);

  if (!editor || !tocVisible || headings.length < MIN_HEADINGS) {
    return null;
  }

  const scrollTo = (pos: number) => {
    editor.chain().setTextSelection(pos).scrollIntoView().run();
  };

  return (
    <nav className="toc-container" aria-label="Table of contents">
      <div className="toc-label">ON THIS PAGE</div>
      <ul className="toc-list">
        {headings.map((h) => (
          <li key={h.id} style={{ paddingLeft: INDENT[h.level] ?? 0 }}>
            <button
              className={`toc-item${h.pos === activePos ? " toc-active" : ""}`}
              onClick={() => scrollTo(h.pos)}
              title={h.text}
            >
              {h.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
