/**
 * Strip markdown syntax and return plain text.
 * Used for generating meta descriptions from plan content.
 */
export function stripMarkdown(md: string): string {
  return (
    md
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "")
      // Remove inline code
      .replace(/`([^`]*)`/g, "$1")
      // Remove images
      .replace(/!\[.*?\]\(.*?\)/g, "")
      // Convert links to just text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Remove heading markers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italic
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/(\*|_)(.*?)\1/g, "$2")
      // Remove strikethrough
      .replace(/~~(.*?)~~/g, "$1")
      // Remove blockquote markers
      .replace(/^\s*>\s?/gm, "")
      // Remove list markers
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // Remove HTML tags
      .replace(/<[^>]*>/g, "")
      // Collapse whitespace
      .replace(/\n{2,}/g, " ")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

import { htmlToPlainText } from "./sanitize";

/**
 * Extract a description from plan content.
 * Returns the first ~155 characters of plain text (for meta description).
 * Branches on contentType so HTML docs don't get fed through the
 * markdown stripper (which would leave attribute strings in the output).
 */
export function extractDescription(
  content: string,
  maxLength: number = 155,
  contentType: "markdown" | "html" = "markdown"
): string {
  const plain =
    contentType === "html" ? htmlToPlainText(content) : stripMarkdown(content);
  if (plain.length <= maxLength) return plain;
  const truncated = plain.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 100 ? truncated.slice(0, lastSpace) : truncated) + "…";
}
