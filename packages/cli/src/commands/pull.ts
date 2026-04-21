import { ApiClient } from "../lib/api";

interface CommentItem {
  id: string;
  authorName: string;
  content: string;
  anchorText: string | null;
  resolved: boolean;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function sanitizeAuthorName(name: string): string {
  return name.replace(/[\n\r]/g, " ").replace(/-->/g, "—>").slice(0, 100);
}

export function annotateMarkdown(
  markdown: string,
  comments: CommentItem[]
): string {
  const anchored: CommentItem[] = [];
  const general: CommentItem[] = [];

  for (const c of comments) {
    if (c.anchorText && c.anchorText.trim()) {
      anchored.push(c);
    } else {
      general.push(c);
    }
  }

  let result = markdown;

  // Header
  result =
    `<!-- RFC FEEDBACK\nThis document contains reviewer comments in <!-- [COMMENT] --> blocks.\nRevise the RFC addressing all comments, then remove the comment blocks. -->\n\n` +
    result;

  // Insert anchored comments after the paragraph containing the anchor text
  // Process in reverse order of position to avoid offset issues
  const insertions: { index: number; block: string }[] = [];

  for (const c of anchored) {
    const anchor = c.anchorText!;
    // Try exact match first
    let matchIdx = result.indexOf(anchor);

    // Fallback: try stripped version (remove markdown syntax)
    if (matchIdx === -1) {
      const stripped = anchor
        .replace(/[*_`~\[\]()#>]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (stripped.length >= 3) {
        matchIdx = result
          .replace(/[*_`~\[\]()#>]/g, "")
          .indexOf(stripped);
      }
    }

    const commentBlock = `\n\n<!-- [COMMENT by ${sanitizeAuthorName(c.authorName)}]\nOn: "${anchor}"\n> ${c.content.replace(/\n/g, "\n> ").replace(/-->/g, "—>")}\n-->`;

    if (matchIdx !== -1) {
      // Find end of the paragraph (next blank line or end of string)
      const afterMatch = matchIdx + anchor.length;
      const nextBlank = result.indexOf("\n\n", afterMatch);
      const insertAt = nextBlank === -1 ? result.length : nextBlank;
      insertions.push({ index: insertAt, block: commentBlock });
    } else {
      // Couldn't place it — treat as general
      general.push(c);
    }
  }

  // Sort insertions by position descending to avoid offset shifts
  insertions.sort((a, b) => b.index - a.index);
  for (const ins of insertions) {
    result =
      result.slice(0, ins.index) + ins.block + result.slice(ins.index);
  }

  // Append general comments at the end
  if (general.length > 0) {
    result += "\n\n<!-- === GENERAL COMMENTS === -->";
    for (const c of general) {
      result += `\n\n<!-- [COMMENT by ${sanitizeAuthorName(c.authorName)}]\n> ${c.content.replace(/\n/g, "\n> ").replace(/-->/g, "—>")}\n-->`;
    }
  }

  return result;
}

function resolveSlug(api: ApiClient, slug: string): Promise<string> {
  // The API uses plan IDs, but the user passes slugs.
  // List plans to find the matching ID.
  return api.listPlans().then(({ plans }) => {
    const match = plans.find((p) => p.slug === slug);
    if (!match) throw new Error(`RFC not found: ${slug}`);
    return match.id;
  });
}

export async function pullCommand(
  slug: string,
  options: { includeResolved?: boolean }
) {
  try {
    const api = new ApiClient();
    const planId = await resolveSlug(api, slug);
    const [plan, { comments }] = await Promise.all([
      api.getPlan(planId),
      api.getComments(planId),
    ]);

    const filtered = options.includeResolved
      ? comments
      : comments.filter((c) => !c.resolved);

    if (filtered.length === 0) {
      // No comments — just output the raw markdown
      process.stdout.write(plan.content);
      return;
    }

    const annotated = annotateMarkdown(plan.content, filtered);
    process.stdout.write(annotated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n  ✗ ${message}\n`);
    process.exit(1);
  }
}
