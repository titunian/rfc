import { readFileSync } from "fs";
import { basename, extname, resolve } from "path";
import { ApiClient } from "../lib/api";
import { loadConfig } from "../lib/config";
import { copyToClipboard } from "../lib/clipboard";

type ContentType = "markdown" | "html";

// Sniff the content type. Filename extension wins (.html/.htm), then a
// quick header check for <!doctype html> / <html / <body — covers the
// case where someone pipes HTML in via stdin without an extension.
export function detectContentType(file: string | undefined, content: string): ContentType {
  if (file) {
    const ext = extname(file).toLowerCase();
    if (ext === ".html" || ext === ".htm") return "html";
    if (ext === ".md" || ext === ".markdown") return "markdown";
  }
  const head = content.trimStart().slice(0, 500).toLowerCase();
  if (
    head.startsWith("<!doctype html") ||
    head.startsWith("<html") ||
    /<\s*(body|head|article)\b/.test(head)
  ) {
    return "html";
  }
  return "markdown";
}

export function inferTitleFromHtml(html: string): string | null {
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

export async function pushCommand(
  file: string | undefined,
  options: {
    title?: string;
    access?: string;
    viewers?: string;
    expires?: string;
    open?: boolean;
    update?: string;
    to?: string;
    slack?: string;
    folder?: string;
    tag?: string;
  }
) {
  let content: string;
  let inferredTitle: string | undefined;

  if (file) {
    const filePath = resolve(file);
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      console.error(`  ✗ Could not read file: ${file}`);
      process.exit(1);
    }
    inferredTitle = basename(file, extname(file));
  } else if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    content = Buffer.concat(chunks).toString("utf-8");
    if (!content.trim()) {
      console.error("  ✗ No content from stdin.");
      process.exit(1);
    }
  } else {
    console.error("  ✗ Pass a file: orfc push plan.md");
    process.exit(1);
  }

  const contentType = detectContentType(file, content);

  // Infer title from the document. Markdown: first "# Heading". HTML:
  // <title> or first <h1>. Fall back to the basename inferred above.
  if (!options.title) {
    if (contentType === "html") {
      const fromHtml = inferTitleFromHtml(content);
      if (fromHtml) inferredTitle = fromHtml;
    } else {
      const headingMatch = content.match(/^#\s+(.+)$/m);
      if (headingMatch) {
        inferredTitle = headingMatch[1].trim();
      }
    }
  }

  const config = loadConfig();
  const title = options.title || inferredTitle || "Untitled Plan";
  const accessRule = options.access || config.defaultAccess || "authenticated";
  const expiresIn = options.expires || config.defaultExpiry;
  const folderPath = options.folder;
  const tags = options.tag
    ? options.tag
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : undefined;

  try {
    const api = new ApiClient();

    let plan;

    if (options.update) {
      // Resolve slug to ID
      const { plans } = await api.listPlans();
      const match = plans.find((p) => p.slug === options.update);
      if (!match) {
        console.error(`\n  ✗ Plan not found: ${options.update}`);
        process.exit(1);
      }
      const updateData: {
        title: string;
        content: string;
        contentType?: "markdown" | "html";
        accessRule?: string;
        allowedViewers?: string | null;
        folderPath?: string;
        tags?: string[];
      } = { title, content, contentType };
      if (options.access) updateData.accessRule = accessRule;
      if (options.viewers !== undefined) updateData.allowedViewers = options.viewers || null;
      if (folderPath !== undefined) updateData.folderPath = folderPath;
      if (tags !== undefined) updateData.tags = tags;
      plan = await api.updatePlan(match.id, updateData);
      console.log(`\n  ✓ Updated: ${plan.url}`);
    } else {
      plan = await api.createPlan({
        title,
        content,
        contentType,
        accessRule,
        allowedViewers: options.viewers,
        expiresIn,
        ...(folderPath !== undefined && { folderPath }),
        ...(tags !== undefined && { tags }),
      });
      console.log(`\n  ✓ Published: ${plan.url}`);
      if (contentType === "html") {
        console.log("  ✓ Type: HTML (rendered sanitized)");
      }
      if (options.viewers) {
        console.log(`  ✓ Restricted to: ${options.viewers}`);
      }
      if (folderPath) {
        console.log(`  ✓ Folder: ${folderPath}`);
      }
      if (tags && tags.length > 0) {
        console.log(`  ✓ Tags: ${tags.join(", ")}`);
      }
    }

    const copied = copyToClipboard(plan.url);
    if (copied) {
      console.log("  ✓ Link copied to clipboard");
    }

    // Auto-open in browser unless --no-open
    if (options.open !== false) {
      try {
        const open = (await import("open")).default;
        await open(plan.url);
        console.log("  ✓ Opened in browser");
      } catch {
        // silently skip if open fails
      }
    }

    // Send notifications
    const emails = options.to
      ?.split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const slackWebhook = options.slack || config.slackWebhook;

    if (emails?.length || slackWebhook) {
      try {
        await api.notify({
          title,
          url: plan.url,
          emails,
          slackWebhook,
        });
        if (emails?.length) {
          console.log(`  ✓ Emailed ${emails.length} reviewer(s)`);
        }
        if (slackWebhook) {
          console.log("  ✓ Sent to Slack");
        }
      } catch {
        console.error("  ⚠ Notification failed (plan still published)");
      }
    }

    console.log("");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n  ✗ ${message}`);
    if (message.includes("Unauthorized") || message.includes("401")) {
      console.error("  Run `orfc login` to authenticate first.\n");
    } else if (
      message.includes("fetch failed") ||
      message.includes("ECONNREFUSED") ||
      message.includes("ENOTFOUND")
    ) {
      console.error(
        "  Could not connect to orfc.dev. Check your internet connection.\n"
      );
    } else {
      console.error(
        "  Run `orfc login` if you haven't authenticated yet.\n"
      );
    }
    process.exit(1);
  }
}
