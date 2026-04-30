import { readFileSync } from "fs";
import { basename, resolve } from "path";
import { ApiClient } from "../lib/api";
import { loadConfig } from "../lib/config";
import { copyToClipboard } from "../lib/clipboard";

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
    inferredTitle = basename(file, ".md");
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

  // Infer title from first heading
  if (!options.title) {
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      inferredTitle = headingMatch[1].trim();
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
      plan = await api.updatePlan(match.id, {
        title,
        content,
        ...(folderPath !== undefined && { folderPath }),
        ...(tags !== undefined && { tags }),
      });
      console.log(`\n  ✓ Updated: ${plan.url}`);
    } else {
      plan = await api.createPlan({
        title,
        content,
        accessRule,
        allowedViewers: options.viewers,
        expiresIn,
        ...(folderPath !== undefined && { folderPath }),
        ...(tags !== undefined && { tags }),
      });
      console.log(`\n  ✓ Published: ${plan.url}`);
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
