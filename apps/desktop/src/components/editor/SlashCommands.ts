import { Extension } from "@tiptap/core";
import type { Editor, Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import { SlashMenu, type SlashMenuRef } from "./SlashMenu";

export interface SlashCommandItem {
  title: string;
  description: string;
  group: string;
  icon: string; // SVG path
  shortcut?: string;
  searchTerms?: string[];
  command: (args: { editor: Editor; range: Range }) => void;
}

const ITEMS: SlashCommandItem[] = [
  {
    title: "Heading 1",
    description: "Big section title",
    group: "Headings",
    icon: "M4 12h16M4 4v16M20 4v16",
    shortcut: "⌘1",
    searchTerms: ["h1", "title", "heading", "large"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section title",
    group: "Headings",
    icon: "M4 12h12M4 4v16M16 4v16M20 9l2 2-2 2",
    shortcut: "⌘2",
    searchTerms: ["h2", "subtitle", "section"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Smaller heading",
    group: "Headings",
    icon: "M4 12h10M4 4v16M14 4v16M18 6h4l-3 4h1a2 2 0 0 1 0 4 2 2 0 0 1-2-2",
    shortcut: "⌘3",
    searchTerms: ["h3"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "Bullet list",
    description: "A simple bulleted list",
    group: "Lists",
    icon: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    shortcut: "⌘⇧8",
    searchTerms: ["ul", "unordered", "bullets", "list"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    description: "An ordered 1-2-3 list",
    group: "Lists",
    icon: "M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1",
    shortcut: "⌘⇧7",
    searchTerms: ["ol", "ordered", "1.", "list"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Task list",
    description: "Checklist with checkboxes",
    group: "Lists",
    icon: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    shortcut: "⌘⇧9",
    searchTerms: ["todo", "task", "checkbox", "checklist"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Quote",
    description: "Pull a passage to highlight it",
    group: "Blocks",
    icon: "M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zM15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z",
    shortcut: "⌘⇧.",
    searchTerms: ["blockquote", "quote"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Code block",
    description: "Fenced syntax-highlighted code",
    group: "Blocks",
    icon: "M16 18l6-6-6-6M8 6l-6 6 6 6",
    shortcut: "⌘;",
    searchTerms: ["code", "snippet", "pre", "```"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Divider",
    description: "Horizontal rule between sections",
    group: "Blocks",
    icon: "M5 12h14",
    searchTerms: ["hr", "rule", "divider", "---"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: "Paragraph",
    description: "Reset to normal text",
    group: "Blocks",
    icon: "M4 6h16M4 12h16M4 18h10",
    shortcut: "⌘0",
    searchTerms: ["text", "p", "normal", "body"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
];

function filterItems(query: string): SlashCommandItem[] {
  if (!query) return ITEMS;
  const q = query.toLowerCase();
  return ITEMS.filter((item) => {
    if (item.title.toLowerCase().includes(q)) return true;
    if (item.description.toLowerCase().includes(q)) return true;
    if (item.searchTerms?.some((t) => t.toLowerCase().includes(q))) return true;
    return false;
  });
}

interface RenderProps extends SuggestionProps<SlashCommandItem> {
  // overridden by the menu component
}

export const SlashCommands = Extension.create({
  name: "slashCommands",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        allowSpaces: false,
        startOfLine: false,
        items: ({ query }: { query: string }) => filterItems(query),
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: SlashCommandItem;
        }) => {
          props.command({ editor, range });
        },
        render: () => {
          let component: ReactRenderer<SlashMenuRef> | null = null;
          let popupEl: HTMLDivElement | null = null;

          const positionPopup = (props: RenderProps) => {
            if (!popupEl) return;
            // Always anchor to the actual cursor position in viewport coords.
            // props.clientRect() can return null on first paint; the editor's
            // coordsAtPos is reliable.
            let rect: DOMRect | null = null;
            try {
              const coords = props.editor.view.coordsAtPos(props.range.from);
              rect = new DOMRect(
                coords.left,
                coords.top,
                0,
                coords.bottom - coords.top
              );
            } catch {
              if (props.clientRect) {
                const r = props.clientRect();
                if (r) rect = r as DOMRect;
              }
            }

            // Lock the position even before we have a rect — start near top-
            // left of the viewport so a flash isn't visible at (0,0).
            popupEl.style.position = "fixed";
            popupEl.style.zIndex = "100";

            if (!rect) {
              popupEl.style.top = "120px";
              popupEl.style.left = "120px";
              return;
            }

            const menuHeight = popupEl.offsetHeight || 360;
            const menuWidth = popupEl.offsetWidth || 320;
            const lineHeight = rect.height || 22;

            // Default: just below the line containing the cursor
            let top = rect.bottom + 6;
            let left = rect.left;

            // Flip above if not enough room below
            if (top + menuHeight > window.innerHeight - 16) {
              top = rect.top - menuHeight - 6;
            }
            // Clamp inside the viewport
            if (left + menuWidth > window.innerWidth - 16) {
              left = window.innerWidth - menuWidth - 16;
            }
            if (left < 16) left = 16;
            if (top < 16) top = rect.bottom + lineHeight; // last-resort fallback

            popupEl.style.top = `${top}px`;
            popupEl.style.left = `${left}px`;
          };

          return {
            onStart: (props: SuggestionProps<SlashCommandItem>) => {
              component = new ReactRenderer(SlashMenu, {
                props,
                editor: props.editor,
              });
              popupEl = document.createElement("div");
              popupEl.appendChild(component.element);
              document.body.appendChild(popupEl);
              positionPopup(props);
            },
            onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
              component?.updateProps(props);
              positionPopup(props);
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === "Escape") {
                if (popupEl) {
                  popupEl.remove();
                  popupEl = null;
                }
                component?.destroy();
                component = null;
                return true;
              }
              return component?.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              if (popupEl) {
                popupEl.remove();
                popupEl = null;
              }
              component?.destroy();
              component = null;
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
