import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useCallback } from "react";
import "../../styles/editor.css";

// Simple markdown → HTML for Tiptap input
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^> (.+)$/gm, "<blockquote><p>$1</p></blockquote>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^---$/gm, "<hr>")
    .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
    .split("\n\n")
    .map((block) => {
      if (block.startsWith("<h") || block.startsWith("<ul") || block.startsWith("<blockquote") || block.startsWith("<hr")) {
        return block;
      }
      if (block.trim()) {
        return `<p>${block}</p>`;
      }
      return "";
    })
    .join("");
}

// HTML → markdown for Tiptap output
function htmlToMarkdown(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;

  function process(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as HTMLElement;
    const children = Array.from(el.childNodes).map(process).join("");

    switch (el.tagName) {
      case "H1": return `# ${children}\n\n`;
      case "H2": return `## ${children}\n\n`;
      case "H3": return `### ${children}\n\n`;
      case "P": return `${children}\n\n`;
      case "STRONG": return `**${children}**`;
      case "EM": return `*${children}*`;
      case "CODE":
        if (el.parentElement?.tagName === "PRE") return children;
        return `\`${children}\``;
      case "PRE": return `\`\`\`\n${children}\n\`\`\`\n\n`;
      case "BLOCKQUOTE": return children.split("\n").filter(Boolean).map((l) => `> ${l.trim()}`).join("\n") + "\n\n";
      case "UL": return children;
      case "OL": return children;
      case "LI": return `- ${children}\n`;
      case "HR": return "---\n\n";
      case "A": return `[${children}](${el.getAttribute("href") || ""})`;
      case "BR": return "\n";
      default: return children;
    }
  }

  return Array.from(div.childNodes).map(process).join("").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

interface EditorProps {
  content: string;
  onChange: (markdown: string) => void;
  className?: string;
}

export function Editor({ content, onChange, className }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Start writing…",
      }),
    ],
    content: content ? markdownToHtml(content) : "",
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const md = htmlToMarkdown(html);
      onChange(md);
    },
  });

  // Sync external content changes (e.g. file open)
  const lastExternalContent = useCallback(() => content, [content]);
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentMd = htmlToMarkdown(editor.getHTML());
      if (currentMd.trim() !== content.trim()) {
        editor.commands.setContent(markdownToHtml(content));
      }
    }
    // Only react to content prop changes, not editor updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastExternalContent, editor]);

  return (
    <div className={className}>
      <EditorContent editor={editor} />
    </div>
  );
}
