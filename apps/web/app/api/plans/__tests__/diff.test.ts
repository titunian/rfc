import { describe, it, expect } from "vitest";
import { computeDiff } from "@/lib/diff";

describe("computeDiff", () => {
  it("produces empty diff for identical texts", () => {
    const result = computeDiff("hello\nworld", "hello\nworld");
    expect(result.every((l) => l.type === "same")).toBe(true);
    expect(result).toHaveLength(2);
  });

  it("detects added lines", () => {
    const result = computeDiff("a\nb", "a\nb\nc");
    const added = result.filter((l) => l.type === "add");
    expect(added).toHaveLength(1);
    expect(added[0].content).toBe("c");
  });

  it("detects removed lines", () => {
    const result = computeDiff("a\nb\nc", "a\nc");
    const removed = result.filter((l) => l.type === "remove");
    expect(removed).toHaveLength(1);
    expect(removed[0].content).toBe("b");
  });

  it("handles empty old text", () => {
    const result = computeDiff("", "hello\nworld");
    const added = result.filter((l) => l.type === "add");
    expect(added.length).toBeGreaterThanOrEqual(1);
  });

  it("handles empty new text", () => {
    const result = computeDiff("hello\nworld", "");
    const removed = result.filter((l) => l.type === "remove");
    expect(removed.length).toBeGreaterThanOrEqual(1);
  });

  describe("DoS prevention — size limit", () => {
    it("rejects old text exceeding 5000 lines", () => {
      const bigText = Array(5001).fill("line").join("\n");
      expect(() => computeDiff(bigText, "small")).toThrow(
        "Document too large for diff"
      );
    });

    it("rejects new text exceeding 5000 lines", () => {
      const bigText = Array(5001).fill("line").join("\n");
      expect(() => computeDiff("small", bigText)).toThrow(
        "Document too large for diff"
      );
    });

    it("accepts texts at exactly 5000 lines", () => {
      const text = Array(5000).fill("x").join("\n");
      expect(() => computeDiff(text, text)).not.toThrow();
    });

    it("rejects when both texts exceed limit", () => {
      const bigText = Array(5001).fill("line").join("\n");
      expect(() => computeDiff(bigText, bigText)).toThrow(
        "Document too large for diff"
      );
    });
  });
});
