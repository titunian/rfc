import DOMPurify from "isomorphic-dompurify";

// Tags we explicitly forbid even if a profile would allow them.
// <iframe>/<frame>/<object>/<embed> can host arbitrary content;
// <form>/<input>/<button> can capture credentials; <style>/<link>
// can pull in remote CSS.
const FORBID_TAGS = [
  "iframe", "frame", "frameset", "object", "embed",
  "form", "input", "button", "select", "textarea", "option",
  "style", "link", "meta", "base",
];

const FORBID_ATTR = [
  "srcdoc", "ping", "formaction", "action", "background",
];

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    // Use the html + svg profiles so SVG charts/diagrams render
    // correctly (camelCase tags like <clipPath>, <linearGradient>
    // need DOMPurify's case-aware SVG handling).
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    FORBID_TAGS,
    FORBID_ATTR,
    // Block all URI schemes except http(s), mailto, and protocol-relative.
    // Notably blocks javascript:, file:, and data: in href contexts.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[/?#]|[a-z0-9.+-]*[/?#])/i,
    // Allow target/rel on <a> so external links can open in a new tab.
    ADD_ATTR: ["target", "rel"],
    KEEP_CONTENT: true,
  });
}

// Plain-text extraction from arbitrary HTML for meta descriptions.
// Sanitizes first, then strips remaining tags. Collapses whitespace.
export function htmlToPlainText(html: string): string {
  const clean = sanitizeHtml(html);
  return clean
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Pull a title out of an HTML document. Prefers <title>, falls back to
// the first <h1>. Returns null when neither is found.
export function extractHtmlTitle(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    const t = titleMatch[1].replace(/\s+/g, " ").trim();
    if (t) return t;
  }
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    const t = h1Match[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    if (t) return t;
  }
  return null;
}
