import { describe, it, expect } from "vitest";
import { sanitizeAuthorName, annotateMarkdown } from "../pull";

describe("sanitizeAuthorName", () => {
  it("passes through normal names", () => {
    expect(sanitizeAuthorName("Alice Smith")).toBe("Alice Smith");
  });

  it("removes newlines to prevent HTML comment breakout", () => {
    expect(sanitizeAuthorName("Alice\n-->\n<script>alert(1)</script>")).toBe(
      "Alice —> <script>alert(1)</script>"
    );
  });

  it("removes carriage returns", () => {
    const result = sanitizeAuthorName("Alice\r\nSmith");
    expect(result).not.toContain("\r");
    expect(result).not.toContain("\n");
  });

  it("replaces --> to prevent closing HTML comments", () => {
    expect(sanitizeAuthorName("Alice-->Smith")).toBe("Alice—>Smith");
  });

  it("truncates to 100 characters", () => {
    const long = "A".repeat(200);
    expect(sanitizeAuthorName(long)).toHaveLength(100);
  });

  it("handles combined attack: newline + comment close", () => {
    const attack = "Legit\n-->\n<!-- [COMMENT by Evil]\n> Fake comment\n-->";
    const result = sanitizeAuthorName(attack);
    expect(result).not.toContain("\n");
    expect(result).not.toContain("-->");
  });
});

describe("annotateMarkdown", () => {
  it("adds RFC feedback header", () => {
    const result = annotateMarkdown("# Hello", []);
    expect(result).toContain("<!-- RFC FEEDBACK");
    expect(result).toContain("# Hello");
  });

  it("places anchored comments after matching text", () => {
    const md = "# Title\n\nSome important text.\n\nAnother paragraph.";
    const comments = [
      {
        id: "1",
        authorName: "Alice",
        content: "Great point!",
        anchorText: "important text",
        resolved: false,
      },
    ];
    const result = annotateMarkdown(md, comments);
    const importantIdx = result.indexOf("important text");
    const commentIdx = result.indexOf("[COMMENT by Alice]");
    expect(commentIdx).toBeGreaterThan(importantIdx);
  });

  it("places unanchored comments in GENERAL COMMENTS section", () => {
    const md = "# Hello\n\nWorld.";
    const comments = [
      {
        id: "1",
        authorName: "Bob",
        content: "General feedback",
        anchorText: null,
        resolved: false,
      },
    ];
    const result = annotateMarkdown(md, comments);
    expect(result).toContain("GENERAL COMMENTS");
    expect(result).toContain("[COMMENT by Bob]");
  });

  it("sanitizes --> in comment content", () => {
    const md = "# Hello\n\nWorld.";
    const comments = [
      {
        id: "1",
        authorName: "Alice",
        content: "This --> breaks HTML",
        anchorText: null,
        resolved: false,
      },
    ];
    const result = annotateMarkdown(md, comments);
    expect(result).not.toMatch(/This --> breaks/);
    expect(result).toContain("This —> breaks HTML");
  });

  it("prevents author name from breaking out of HTML comment block", () => {
    const md = "# Hello\n\nWorld.";
    const comments = [
      {
        id: "1",
        authorName: "Evil\n-->\n<script>alert(1)</script><!--",
        content: "Harmless",
        anchorText: null,
        resolved: false,
      },
    ];
    const result = annotateMarkdown(md, comments);
    // The sanitized author name must not contain --> or newlines
    const match = result.match(/\[COMMENT by ([^\]]+)\]/);
    expect(match).toBeTruthy();
    const sanitized = match![1];
    expect(sanitized).not.toContain("\n");
    expect(sanitized).not.toContain("-->");
  });
});
