const GENERIC_HEADINGS = new Set([
  "overview",
  "introduction",
  "conclusion",
  "summary",
  "references",
  "appendix",
  "table of contents",
  "tl;dr",
  "tldr",
  "open questions",
  "next steps",
]);

const BOLD_SKIP = new Set([
  "note",
  "important",
  "warning",
  "example",
  "todo",
]);

const BACKTICK_SKIP = new Set([
  "true",
  "false",
  "null",
  "undefined",
  "i",
  "n",
  "e",
  "x",
  "k",
  "v",
  "ok",
  "if",
  "in",
  "do",
  "no",
  "id",
]);

function normalize(tag: string): string {
  return tag.toLowerCase().trim().replace(/\s+/g, "-");
}

export function extractTags(markdown: string): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();

  function add(raw: string) {
    const tag = normalize(raw);
    if (tag.length < 2) return;
    if (seen.has(tag)) return;
    seen.add(tag);
    tags.push(tag);
  }

  const lines = markdown.split("\n");

  // 1. Headings (## and ###)
  for (const line of lines) {
    const match = line.match(/^#{2,3}\s+(.+)$/);
    if (match) {
      const text = match[1].trim().replace(/#+$/, "").trim();
      const lower = text.toLowerCase();
      if (!GENERIC_HEADINGS.has(lower)) {
        add(text);
      }
    }
  }

  // 2. #hashtags
  const hashtagRe = /(?:^|\s)#([a-zA-Z][\w-]*)/g;
  let m: RegExpExecArray | null;
  while ((m = hashtagRe.exec(markdown)) !== null) {
    add(m[1]);
  }

  // 3. Code block languages
  const codeBlockRe = /^```(\w+)/gm;
  while ((m = codeBlockRe.exec(markdown)) !== null) {
    add(m[1]);
  }

  // 4. Bold key phrases (1-3 words)
  const boldRe = /\*\*([^*]+)\*\*/g;
  while ((m = boldRe.exec(markdown)) !== null) {
    const text = m[1].trim();
    const wordCount = text.split(/\s+/).length;
    if (wordCount >= 1 && wordCount <= 3) {
      const lower = text.toLowerCase();
      if (!BOLD_SKIP.has(lower)) {
        add(text);
      }
    }
  }

  // 5. Technical terms in backticks (1-2 words, no spaces in single backtick means 1 word mostly)
  const backtickRe = /(?<!`)`([^`]+)`(?!`)/g;
  while ((m = backtickRe.exec(markdown)) !== null) {
    const text = m[1].trim();
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 2) continue;
    if (text.length <= 2) continue;
    const lower = text.toLowerCase();
    if (BACKTICK_SKIP.has(lower)) continue;
    add(text);
  }

  // Post-processing: already deduplicated and normalized via add()
  // Cap at 15, sort alphabetically
  return tags.sort((a, b) => a.localeCompare(b)).slice(0, 15);
}
