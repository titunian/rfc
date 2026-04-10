import CodeBlock from "@tiptap/extension-code-block";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { MermaidRenderer } from "./MermaidRenderer";
import type { NodeViewProps } from "@tiptap/react";

/**
 * NodeView component for mermaid code blocks.
 * Renders the mermaid diagram as an SVG instead of showing raw code.
 */
function MermaidNodeView({ node }: NodeViewProps) {
  const code = node.textContent;
  return (
    <NodeViewWrapper as="div" className="mermaid-node-view">
      <MermaidRenderer code={code} />
    </NodeViewWrapper>
  );
}

/**
 * Tiptap extension that extends the built-in CodeBlock to detect
 * `language: "mermaid"` and render diagrams via a custom NodeView.
 *
 * For non-mermaid code blocks, the default rendering is used.
 */
export const MermaidCodeBlock = CodeBlock.extend({
  // Override the node view to intercept mermaid blocks.
  addNodeView() {
    const reactRenderer = ReactNodeViewRenderer(MermaidNodeView);
    return (props) => {
      const language = props.node.attrs.language;
      if (language === "mermaid") {
        return reactRenderer(props);
      }
      // For non-mermaid code blocks, return a minimal NodeView that
      // delegates to the default DOM rendering (toDOM).
      const dom = document.createElement("pre");
      dom.classList.add("code-block");
      const contentDOM = document.createElement("code");
      dom.appendChild(contentDOM);
      return { dom, contentDOM };
    };
  },
});
