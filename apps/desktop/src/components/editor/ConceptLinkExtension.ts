// ── Wiki-link extension for Tiptap ───────────────────────────────
//
// Matches `[[concept-name]]` syntax in the document and renders it
// as a styled inline chip. Implemented as a ProseMirror plugin that
// creates inline decorations (same pattern as CommentHighlights).

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

interface ConceptLinkOptions {
  onClickConcept: (name: string) => void;
}

const pluginKey = new PluginKey<DecorationSet>("conceptLinks");

/**
 * Scans all text nodes for [[concept-name]] patterns and wraps them
 * in inline decorations styled as concept chips.
 */
function buildDecorations(doc: PMNode): DecorationSet {
  const decorations: Decoration[] = [];

  // Collect all text nodes with their absolute positions
  const textNodes: { text: string; from: number }[] = [];
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      textNodes.push({ text: node.text, from: pos });
    }
  });

  const wikiLinkRe = /\[\[([^\]\n]{1,80})\]\]/g;

  for (const tn of textNodes) {
    let m: RegExpExecArray | null;
    wikiLinkRe.lastIndex = 0;
    while ((m = wikiLinkRe.exec(tn.text)) !== null) {
      const from = tn.from + m.index;
      const to = from + m[0].length;
      const conceptName = m[1].trim();

      decorations.push(
        Decoration.inline(from, to, {
          class: "concept-link-chip",
          "data-concept-name": conceptName,
          title: conceptName,
        })
      );
    }
  }

  return DecorationSet.create(doc, decorations);
}

export const ConceptLinkExtension = Extension.create<ConceptLinkOptions>({
  name: "conceptLinks",

  addOptions() {
    return {
      onClickConcept: () => {},
    };
  },

  addProseMirrorPlugins() {
    const ext = this;

    return [
      new Plugin<DecorationSet>({
        key: pluginKey,
        state: {
          init: (_, { doc }) => buildDecorations(doc),
          apply(tr, old) {
            return tr.docChanged ? buildDecorations(tr.doc) : old;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleClick(_view, _pos, event) {
            const target = (event.target as HTMLElement).closest(
              ".concept-link-chip"
            ) as HTMLElement | null;
            if (target?.dataset.conceptName) {
              ext.options.onClickConcept(target.dataset.conceptName);
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});
