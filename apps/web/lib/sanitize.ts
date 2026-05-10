import sanitize from "sanitize-html";

// Switched from isomorphic-dompurify → sanitize-html on 2026-05-10.
// Reason: jsdom 28 (pulled by isomorphic-dompurify@2.36) transitively
// requires @exodus/bytes via html-encoding-sniffer@6, which is ESM
// only. Vercel's CommonJS serverless runtime does require() on it
// and crashes the route handler with ERR_REQUIRE_ESM. sanitize-html
// has no DOM dependency at all — pure htmlparser2 — so it bundles
// cleanly into the serverless function.

// HTML doc tags we keep. SVG tags + filters listed explicitly because
// htmlparser2 needs to know about them (case-preservation is a
// separate parser flag below).
const HTML_TAGS = [
  "a", "abbr", "address", "article", "aside", "b", "blockquote", "br",
  "caption", "cite", "code", "col", "colgroup", "dd", "del", "details",
  "dfn", "div", "dl", "dt", "em", "figcaption", "figure", "footer",
  "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "hr", "i",
  "img", "ins", "kbd", "li", "main", "mark", "nav", "ol", "p", "picture",
  "pre", "q", "s", "samp", "section", "small", "source", "span",
  "strong", "style", "sub", "summary", "sup", "table", "tbody", "td",
  "tfoot", "th", "thead", "time", "tr", "u", "ul", "var", "wbr",
];

const SVG_TAGS = [
  "svg", "g", "path", "circle", "rect", "line", "polyline", "polygon",
  "ellipse", "text", "tspan", "textPath", "defs", "marker",
  "linearGradient", "radialGradient", "stop", "clipPath", "mask",
  "pattern", "use", "symbol", "filter", "feGaussianBlur", "feOffset",
  "feMerge", "feMergeNode", "feBlend", "feColorMatrix", "feFlood",
  "feComposite", "feDropShadow", "title", "desc", "image", "animate",
  "animateTransform",
];

const COMMON_ATTR = [
  "href", "src", "srcset", "alt", "title", "class", "id", "name",
  "style", "role", "aria-label", "aria-labelledby", "aria-describedby",
  "aria-hidden", "tabindex",
  "colspan", "rowspan", "scope", "headers",
  "lang", "dir",
  "loading", "decoding", "width", "height",
  "datetime",
  "data-language",
  "target", "rel",
];

const SVG_ATTR = [
  "viewBox", "preserveAspectRatio", "xmlns", "xmlns:xlink",
  "x", "y", "x1", "x2", "y1", "y2",
  "cx", "cy", "r", "rx", "ry",
  "d", "points",
  "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
  "stroke-dasharray", "stroke-dashoffset", "stroke-miterlimit",
  "fill-rule", "fill-opacity", "stroke-opacity", "opacity",
  "transform", "transform-origin",
  "text-anchor", "dominant-baseline", "alignment-baseline",
  "font-size", "font-family", "font-weight", "letter-spacing",
  "offset", "stop-color", "stop-opacity",
  "gradientUnits", "gradientTransform", "spreadMethod",
  "patternUnits", "patternTransform",
  "marker-start", "marker-mid", "marker-end",
  "vector-effect", "pointer-events", "clip-path",
  "version", "baseProfile", "color-interpolation-filters",
];

const ALLOWED_TAGS = [...HTML_TAGS, ...SVG_TAGS];
const ALLOWED_ATTRS = [...COMMON_ATTR, ...SVG_ATTR];

export function sanitizeHtml(dirty: string): string {
  return sanitize(dirty, {
    allowedTags: ALLOWED_TAGS,
    // '*' means "these attrs are allowed on any tag we kept".
    allowedAttributes: { "*": ALLOWED_ATTRS },
    // Block javascript:/vbscript:/file: URIs in href, src, etc.
    // Also explicitly drop data: in href contexts (data:text/html
    // can run script). Allow data: in <img src> only.
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
    },
    allowedSchemesAppliedToAttributes: ["href", "src", "cite", "action"],
    // Preserve SVG case (<linearGradient>, viewBox, …). Without these
    // flags, htmlparser2 lowercases everything and SVG breaks silently.
    parser: {
      lowerCaseTags: false,
      lowerCaseAttributeNames: false,
      decodeEntities: true,
    },
    // Keep CSS as-is — DOMPurify's old role of CSS sanitization was
    // mostly cosmetic; expression() is dead since IE, and url() with
    // dangerous schemes still gets caught by allowedSchemes above.
    allowedStyles: undefined,
    // Drop content inside disallowed tags (don't show raw script
    // bodies as text). <style> is now an allowed tag so HTML docs
    // can use :target / :has() for in-page navigation.
    nonTextTags: ["script", "textarea", "option", "noscript"],
    allowVulnerableTags: true,
  });
}

// Plain-text extraction from arbitrary HTML for meta descriptions.
export function htmlToPlainText(html: string): string {
  // Inject a space between adjacent tags before stripping so that
  // "<h1>Hello</h1><p>World</p>" becomes "Hello World", not
  // "HelloWorld". sanitize-html strips tags directly and doesn't
  // insert whitespace at element boundaries on its own.
  const spaced = html.replace(/></g, "> <");
  const clean = sanitize(spaced, {
    allowedTags: [],
    allowedAttributes: {},
    nonTextTags: ["style", "script", "textarea", "option", "noscript"],
  });
  return clean
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Pull a title out of an HTML document. Prefers <title>, falls back
// to the first <h1>. Returns null when neither is found.
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
