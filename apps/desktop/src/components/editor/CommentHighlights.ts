import { Extension, type Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

// Shape of a comment passed to the extension. We only need anchor text
// + id + resolved state to decide which ones to draw.
export interface HighlightComment {
  id: string;
  anchorText: string | null;
  resolved: boolean;
}

interface CommentHighlightsOptions {
  comments: HighlightComment[];
  activeId: string | null;
  onClick: (id: string) => void;
}

const pluginKey = new PluginKey<DecorationSet>("commentHighlights");

/**
 * Finds every comment's anchorText inside the doc's text content and wraps
 * it in an inline decoration so reviewers can see where each comment lives.
 * Matching is case-sensitive and uses the FIRST occurrence only — same
 * behavior as the web viewer.
 */
function buildDecorations(
  doc: PMNode,
  comments: HighlightComment[],
  activeId: string | null
): DecorationSet {
  if (!comments.length) return DecorationSet.empty;

  // Collect every text node with its absolute start position in the doc.
  const textNodes: { text: string; from: number }[] = [];
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      textNodes.push({ text: node.text, from: pos });
    }
  });
  if (!textNodes.length) return DecorationSet.empty;

  const decorations: Decoration[] = [];
  const usedRanges = new Set<string>();

  for (const comment of comments) {
    if (!comment.anchorText) continue;
    if (comment.resolved) continue;

    const anchor = comment.anchorText;

    // Try text-node-local match first. For anchors that span multiple text
    // nodes we fall back to a concatenated-doc scan.
    let matchFrom = -1;
    let matchTo = -1;

    for (const tn of textNodes) {
      const idx = tn.text.indexOf(anchor);
      if (idx !== -1) {
        matchFrom = tn.from + idx;
        matchTo = matchFrom + anchor.length;
        break;
      }
    }

    if (matchFrom === -1) {
      // Fallback: build a flat string of the whole doc and find by offset.
      // Text nodes in a ProseMirror doc are addressable by the cumulative
      // length of preceding text nodes PLUS one position per non-text
      // boundary. We do a rough scan: concat text with no padding and track
      // char-to-pos mapping.
      let concatenated = "";
      const charToPos: number[] = [];
      for (const tn of textNodes) {
        for (let i = 0; i < tn.text.length; i++) {
          charToPos.push(tn.from + i);
          concatenated += tn.text[i];
        }
      }
      const idx = concatenated.indexOf(anchor);
      if (idx !== -1 && charToPos[idx] !== undefined) {
        matchFrom = charToPos[idx];
        matchTo = (charToPos[idx + anchor.length - 1] ?? matchFrom) + 1;
      }
    }

    if (matchFrom === -1 || matchTo === -1) continue;
    const key = `${matchFrom}-${matchTo}`;
    if (usedRanges.has(key)) continue;
    usedRanges.add(key);

    const isActive = comment.id === activeId;
    decorations.push(
      Decoration.inline(matchFrom, matchTo, {
        class: `comment-highlight${isActive ? " is-active" : ""}`,
        "data-comment-id": comment.id,
      })
    );
  }

  return DecorationSet.create(doc, decorations);
}

export const CommentHighlights = Extension.create<CommentHighlightsOptions>({
  name: "commentHighlights",

  addOptions() {
    return {
      comments: [],
      activeId: null,
      onClick: () => {},
    };
  },

  addProseMirrorPlugins() {
    const ext = this;

    return [
      new Plugin<DecorationSet>({
        key: pluginKey,
        state: {
          init: (_, { doc }) =>
            buildDecorations(doc, ext.options.comments, ext.options.activeId),
          apply(tr, old) {
            const meta = tr.getMeta(pluginKey) as
              | { comments?: HighlightComment[]; activeId?: string | null }
              | undefined;
            if (meta) {
              return buildDecorations(
                tr.doc,
                meta.comments ?? ext.options.comments,
                meta.activeId ?? ext.options.activeId
              );
            }
            return tr.docChanged
              ? buildDecorations(
                  tr.doc,
                  ext.options.comments,
                  ext.options.activeId
                )
              : old;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleClick(_view, _pos, event) {
            const target = (event.target as HTMLElement).closest(
              ".comment-highlight"
            ) as HTMLElement | null;
            if (target?.dataset.commentId) {
              ext.options.onClick(target.dataset.commentId);
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});

/**
 * Helper to push updated comment data into an already-running editor.
 */
export function updateCommentHighlights(
  editor: Editor | null,
  comments: HighlightComment[],
  activeId: string | null
) {
  if (!editor) return;
  const { tr } = editor.view.state;
  editor.view.dispatch(tr.setMeta(pluginKey, { comments, activeId }));
}
