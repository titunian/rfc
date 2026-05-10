import { describe, it, expect } from "vitest";
import { detectContentType, inferTitleFromHtml } from "../push";

describe("detectContentType", () => {
  it("flags .html files as html", () => {
    expect(detectContentType("foo.html", "anything")).toBe("html");
    expect(detectContentType("path/to/Foo.HTM", "anything")).toBe("html");
  });

  it("flags .md / .markdown files as markdown", () => {
    expect(detectContentType("foo.md", "<html>...")).toBe("markdown");
    expect(detectContentType("foo.markdown", "irrelevant")).toBe("markdown");
  });

  it("sniffs a doctype on stdin without a filename", () => {
    expect(detectContentType(undefined, "<!doctype html>\n<html>...")).toBe(
      "html"
    );
  });

  it("sniffs a leading <html> tag", () => {
    expect(detectContentType(undefined, "  <html><body>x")).toBe("html");
  });

  it("sniffs an <article> root", () => {
    expect(detectContentType(undefined, "<article>Hi</article>")).toBe("html");
  });

  it("falls back to markdown for plain text", () => {
    expect(detectContentType(undefined, "# Title\n\nA paragraph.")).toBe(
      "markdown"
    );
  });

  it("treats unknown extensions with markdown-shaped content as markdown", () => {
    expect(detectContentType("notes.txt", "Some prose with no tags.")).toBe(
      "markdown"
    );
  });
});

describe("inferTitleFromHtml", () => {
  it("prefers <title> tag", () => {
    expect(inferTitleFromHtml("<title>Doc</title><h1>Other</h1>")).toBe(
      "Doc"
    );
  });

  it("falls back to <h1>", () => {
    expect(inferTitleFromHtml("<html><body><h1>Hi there</h1></body></html>"))
      .toBe("Hi there");
  });

  it("collapses whitespace in <title>", () => {
    expect(inferTitleFromHtml("<title>\n  Multi   Line\n</title>")).toBe(
      "Multi Line"
    );
  });

  it("returns null when neither is present", () => {
    expect(inferTitleFromHtml("<p>nothing here</p>")).toBeNull();
  });
});
