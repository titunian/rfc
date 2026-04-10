import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Typography from "@tiptap/extension-typography";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { marked } from "marked";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { useEffect, useCallback, useMemo, useRef } from "react";
import { useEditorStore } from "../../stores/editor-store";
import { useCloudStore } from "../../stores/cloud-store";
import { useAppStore } from "../../stores/app-store";
import {
  CommentHighlights,
  updateCommentHighlights,
  type HighlightComment,
} from "./CommentHighlights";
import { ConceptLinkExtension } from "./ConceptLinkExtension";
import { SlashCommands } from "./SlashCommands";
import { MermaidCodeBlock } from "./MermaidCodeBlock";
import { SelectionCommentPopover } from "./SelectionCommentPopover";
import { TableOfContents } from "./TableOfContents";
import { useConceptsStore } from "../../stores/concepts-store";
import "../../styles/editor.css";

// ── Markdown ↔ HTML ───────────────────────────────────────────────

marked.setOptions({ gfm: true, breaks: false });

function markdownToHtml(md: string): string {
  if (!md || !md.trim()) {
    // Empty doc — seed with an empty title + body paragraph so the
    // placeholder shows in both slots and hitting Enter on the title
    // drops into the paragraph below.
    return "<h1></h1><p></p>";
  }
  const out = marked.parse(md, { async: false }) as string;
  return out;
}

function buildTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
    strongDelimiter: "**",
    hr: "---",
  });
  td.use(gfm);

  // Task list checkboxes — keep the [ ] / [x] in the output.
  td.addRule("taskList", {
    filter: (node) =>
      node.nodeName === "LI" &&
      (node.getAttribute("data-type") === "taskItem" ||
        !!node.querySelector("input[type='checkbox']")),
    replacement: (content, node) => {
      const el = node as HTMLElement;
      const cb = el.querySelector("input[type='checkbox']") as
        | HTMLInputElement
        | null;
      const checked = cb?.checked ? "x" : " ";
      const clean = content
        .replace(/\n+$/, "")
        .split("\n")
        .map((line) => line.trimStart())
        .join(" ")
        .trim();
      return `- [${checked}] ${clean}\n`;
    },
  });

  return td;
}

// Extract the first H1's text from HTML — that's the title.
function extractTitleFromHtml(html: string): string {
  if (!html) return "";
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return "";
  return match[1]
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// ── Component ─────────────────────────────────────────────────────

interface EditorProps {
  content: string;
  onChange: (markdown: string) => void;
  className?: string;
}

export function Editor({ content, onChange, className }: EditorProps) {
  const turndown = useMemo(() => buildTurndown(), []);
  const lastTitleRef = useRef<string>("");
  // Tracks the markdown the editor itself most recently emitted via onUpdate.
  // Used to distinguish "store content changed because the user typed" (skip
  // re-sync) from "store content changed externally" (reset the editor).
  const lastEmittedRef = useRef<string>("");
  const extractTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comments = useCloudStore((s) => s.comments);
  const { toggleRightPanel } = useAppStore();
  const previewVersion = useEditorStore((s) => s.previewVersion);
  const isPreview = !!previewVersion;

  // Debounced concept extraction — runs 5s after last edit
  const scheduleExtraction = useCallback((md: string) => {
    if (extractTimerRef.current) clearTimeout(extractTimerRef.current);
    extractTimerRef.current = setTimeout(() => {
      const { planId, fileName } = useEditorStore.getState();
      const docId = planId || fileName || "local";
      const docTitle = fileName || "Untitled";
      useConceptsStore.getState().extractAndIndex(docId, docTitle, md);
    }, 5000);
  }, []);
  // What we actually display: the preview version's content overrides the
  // working content when set, otherwise we render the live editable content.
  const displayContent = previewVersion ? previewVersion.content : content;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        // Disable built-in codeBlock — we use MermaidCodeBlock which
        // extends it with a custom NodeView for mermaid diagrams.
        codeBlock: false,
      }),
      MermaidCodeBlock.configure({
        HTMLAttributes: { class: "code-block" },
      }),
      Placeholder.configure({
        placeholder: ({ node, pos }) => {
          if (node.type.name === "heading" && node.attrs.level === 1 && pos === 0) {
            return "Untitled";
          }
          if (node.type.name === "paragraph") {
            return "/ for blocks · ⌘K for commands";
          }
          return "";
        },
        showOnlyCurrent: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          class: "md-link",
        },
      }),
      Typography,
      TaskList.configure({ HTMLAttributes: { class: "task-list" } }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: { class: "task-item" },
      }),
      CommentHighlights.configure({
        comments: [],
        activeId: null,
        onClick: (id) => {
          // Activate the comment and open the comments drawer.
          useCloudStore.setState({});
          toggleRightPanel("comments");
          window.dispatchEvent(
            new CustomEvent("orfc:focus-comment", { detail: { id } })
          );
        },
      }),
      SlashCommands,
      ConceptLinkExtension.configure({
        onClickConcept: (name) => {
          // Open concepts panel and focus on the clicked concept
          useAppStore.getState().conceptsVisible || useAppStore.getState().toggleConcepts();
          window.dispatchEvent(
            new CustomEvent("orfc:focus-concept", { detail: { name } })
          );
        },
      }),
    ],
    content: markdownToHtml(displayContent),
    editable: !isPreview,
    editorProps: {
      attributes: {
        class: "tiptap-editor",
        spellcheck: isPreview ? "false" : "true",
      },
    },
    onUpdate: ({ editor }) => {
      // Don't capture edits while previewing — the editor is read-only.
      if (useEditorStore.getState().previewVersion) return;
      const html = editor.getHTML();
      const md = turndown.turndown(html).replace(/\n{3,}/g, "\n\n") + "\n";
      lastEmittedRef.current = md;
      onChange(md);
      scheduleExtraction(md);

      // Sync the title (first h1) into editor store so it's the single
      // source of truth for fileName — no duplication across chrome.
      const title = extractTitleFromHtml(html);
      if (title !== lastTitleRef.current) {
        lastTitleRef.current = title;
        useEditorStore.getState().setTitle(title || "Untitled");
      }
    },
  });

  // When previewVersion changes (or unsets), swap the editor content + editability.
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!isPreview);
    const targetMd = displayContent;
    const currentMd = (turndown.turndown(editor.getHTML()) + "\n").replace(
      /\n{3,}/g,
      "\n\n"
    );
    if (currentMd.trim() !== targetMd.trim()) {
      editor.commands.setContent(markdownToHtml(targetMd));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewVersion?.versionId, isPreview]);

  // Sync EXTERNAL content changes (file open, new file, cloud pull).
  // We skip the sync if the store content matches the markdown the editor
  // itself just emitted — that means the change was a user edit echoing
  // back through the store, not a real external change. Without this
  // guard the effect would re-set the editor on every keystroke.
  const lastExternalContent = useCallback(() => content, [content]);
  useEffect(() => {
    if (!editor || content === undefined || isPreview) return;
    if (content === lastEmittedRef.current) return;

    const currentMd =
      (turndown.turndown(editor.getHTML()) + "\n").replace(/\n{3,}/g, "\n\n");
    if (currentMd.trim() === content.trim()) {
      // The editor's current state already matches the external content;
      // nothing to do but record what we emit so the next user edit doesn't
      // trip this effect.
      lastEmittedRef.current = currentMd;
      return;
    }

    editor.commands.setContent(markdownToHtml(content));
    lastTitleRef.current = extractTitleFromHtml(editor.getHTML());
    // Capture the canonical (round-tripped) form and use it as the new
    // synced baseline so subsequent edits dirty against the right reference.
    const canonical =
      (turndown.turndown(editor.getHTML()) + "\n").replace(/\n{3,}/g, "\n\n");
    lastEmittedRef.current = canonical;
    useEditorStore.getState().reconcileSyncedContent(canonical);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastExternalContent, editor, isPreview]);

  // Re-compute comment highlights whenever the comments array changes.
  useEffect(() => {
    if (!editor) return;
    const highlightable: HighlightComment[] = comments.map((c) => ({
      id: c.id,
      anchorText: c.anchorText,
      resolved: c.resolved,
    }));
    updateCommentHighlights(editor, highlightable, null);
  }, [editor, comments]);

  // Editor-scoped keyboard shortcuts beyond what StarterKit provides.
  useEffect(() => {
    if (!editor) return;
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || !editor.isFocused) return;

      // ⌘1 / ⌘2 / ⌘3 / ⌘4 — set heading level
      if (!e.shiftKey && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        editor
          .chain()
          .focus()
          .toggleHeading({ level: Number(e.key) as 1 | 2 | 3 | 4 })
          .run();
        return;
      }
      // ⌘0 — paragraph
      if (!e.shiftKey && e.key === "0") {
        e.preventDefault();
        editor.chain().focus().setParagraph().run();
        return;
      }
      // ⌘; — toggle code block
      if (e.key === ";") {
        e.preventDefault();
        editor.chain().focus().toggleCodeBlock().run();
        return;
      }
      // ⌘Shift+7 / 8 — ordered / bullet list
      if (e.shiftKey && e.key === "7") {
        e.preventDefault();
        editor.chain().focus().toggleOrderedList().run();
        return;
      }
      if (e.shiftKey && e.key === "8") {
        e.preventDefault();
        editor.chain().focus().toggleBulletList().run();
        return;
      }
      // ⌘Shift+9 — task list
      if (e.shiftKey && e.key === "9") {
        e.preventDefault();
        editor.chain().focus().toggleTaskList().run();
        return;
      }
      // ⌘Shift+. — blockquote
      if (e.shiftKey && e.key === ".") {
        e.preventDefault();
        editor.chain().focus().toggleBlockquote().run();
        return;
      }
      // ⌘Shift+M — comment on selection
      if (e.shiftKey && (e.key === "m" || e.key === "M")) {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          e.preventDefault();
          window.dispatchEvent(new Event("orfc:comment-on-selection"));
        }
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editor]);

  return (
    <div className={`editor-with-toc ${className ?? ""}`}>
      <TableOfContents editor={editor} />
      <EditorContent editor={editor} />
      {editor && !isPreview && <SelectionCommentPopover editor={editor} />}
    </div>
  );
}
