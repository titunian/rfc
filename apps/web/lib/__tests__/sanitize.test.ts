import { describe, it, expect } from "vitest";
import {
  sanitizeHtml,
  htmlToPlainText,
  extractHtmlTitle,
} from "../sanitize";

describe("sanitizeHtml", () => {
  it("preserves common doc tags", () => {
    const html =
      "<h1>Title</h1><p>Hello <strong>world</strong>.</p><ul><li>One</li></ul>";
    const out = sanitizeHtml(html);
    expect(out).toContain("<h1>Title</h1>");
    expect(out).toContain("<strong>world</strong>");
    expect(out).toContain("<li>One</li>");
  });

  it("strips <script> and inline event handlers", () => {
    const html =
      "<p onclick=\"alert(1)\">Hi</p><script>alert(2)</script><img src=x onerror=\"alert(3)\">";
    const out = sanitizeHtml(html);
    expect(out).not.toContain("<script");
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("onerror");
    expect(out).toContain("<p>Hi</p>");
  });

  it("blocks javascript: URIs in href", () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain("javascript:");
  });

  it("allows http(s) and mailto: links", () => {
    const out = sanitizeHtml(
      '<a href="https://orfc.dev">x</a><a href="mailto:a@b.co">y</a>'
    );
    expect(out).toContain('href="https://orfc.dev"');
    expect(out).toContain('href="mailto:a@b.co"');
  });

  it("strips <iframe> tags", () => {
    const out = sanitizeHtml('<iframe src="https://evil.example"></iframe>');
    expect(out).not.toContain("<iframe");
  });

  it("keeps <style> blocks (needed for :target sub-page nav)", () => {
    // <style> is intentionally allowed so HTML docs can ship
    // self-contained CSS for in-page navigation. CSS can't execute
    // JS, so the risk is bounded to layout/presentation drift
    // within the doc's own container.
    const out = sanitizeHtml("<style>body{display:none}</style><p>Hi</p>");
    expect(out).toContain("<style>");
    expect(out).toContain("<p>Hi</p>");
  });

  it("preserves heading id attributes for anchor links", () => {
    const out = sanitizeHtml('<h2 id="overview">Overview</h2>');
    expect(out).toContain('id="overview"');
  });

  it("preserves inline SVG (charts, icons)", () => {
    const svg =
      '<svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#f00"/></linearGradient></defs>' +
      '<rect x="0" y="0" width="100" height="50" fill="url(#g)"/>' +
      '<line x1="0" y1="0" x2="100" y2="50" stroke="blue" stroke-width="2"/>' +
      '<text x="50" y="25" text-anchor="middle">Hi</text>' +
      "</svg>";
    const out = sanitizeHtml(svg);
    expect(out).toContain("<svg");
    expect(out).toContain("<linearGradient");
    expect(out).toContain("<rect");
    expect(out).toContain("<text");
    // Geometry attrs — these were silently being stripped by an
    // overly strict ALLOWED_URI_REGEXP earlier. Charts can't render
    // without them, so assert each one explicitly.
    expect(out).toContain('viewBox="0 0 100 50"');
    expect(out).toContain('x1="0"');
    expect(out).toContain('y2="50"');
    expect(out).toContain('width="100"');
    expect(out).toContain('stroke-width="2"');
    expect(out).toContain('text-anchor="middle"');
  });

  it("strips <svg onload> handlers but keeps the svg", () => {
    const out = sanitizeHtml(
      '<svg onload="alert(1)" viewBox="0 0 1 1"><circle r="0.5"/></svg>'
    );
    expect(out).toContain("<svg");
    expect(out).not.toContain("onload");
    expect(out).toContain("<circle");
  });

  it("preserves inline style attributes for layout", () => {
    const out = sanitizeHtml(
      '<div style="color: red; padding: 8px">Boxed</div>'
    );
    // sanitize-html may collapse internal whitespace inside style
    // values; assert presence of both declarations rather than the
    // exact string.
    expect(out).toMatch(/<div style="[^"]*color\s*:\s*red[^"]*"/);
    expect(out).toMatch(/padding\s*:\s*8px/);
    expect(out).toContain("Boxed");
  });

  it("preserves <style> blocks for in-page navigation", () => {
    const out = sanitizeHtml(
      "<style>.page { display: none } .page:target { display: block }</style><div class=\"page\" id=\"a\">A</div>"
    );
    expect(out).toContain("<style>");
    expect(out).toContain(".page:target");
    expect(out).toContain('id="a"');
  });
});

describe("htmlToPlainText", () => {
  it("extracts text from nested tags", () => {
    expect(
      htmlToPlainText("<h1>Hello</h1><p>How <em>are</em> you?</p>")
    ).toBe("Hello How are you?");
  });

  it("decodes common HTML entities", () => {
    expect(htmlToPlainText("<p>A &amp; B &lt; C</p>")).toBe("A & B < C");
  });

  it("returns empty string for an all-script payload", () => {
    expect(htmlToPlainText("<script>alert(1)</script>")).toBe("");
  });
});

describe("extractHtmlTitle", () => {
  it("prefers <title> over <h1>", () => {
    const html = "<title>From Head</title><h1>From Body</h1>";
    expect(extractHtmlTitle(html)).toBe("From Head");
  });

  it("falls back to <h1> when no <title>", () => {
    expect(extractHtmlTitle("<h1>Just H1</h1>")).toBe("Just H1");
  });

  it("strips inline tags from <h1>", () => {
    expect(extractHtmlTitle("<h1>Hello <em>world</em></h1>")).toBe(
      "Hello world"
    );
  });

  it("returns null when nothing usable is present", () => {
    expect(extractHtmlTitle("<p>Just a paragraph</p>")).toBeNull();
  });
});
