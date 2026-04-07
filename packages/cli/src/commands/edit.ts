import { ApiClient } from "../lib/api";
import { spawnSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

function resolveSlug(api: ApiClient, slug: string): Promise<string> {
  return api.listPlans().then(({ plans }) => {
    const match = plans.find((p) => p.slug === slug);
    if (!match) throw new Error(`RFC not found: ${slug}`);
    return match.id;
  });
}

export async function editCommand(slug: string) {
  try {
    const editor = process.env.EDITOR || process.env.VISUAL;
    if (!editor) {
      console.error(
        "\n  ✗ $EDITOR is not set.\n" +
          "    Set it (e.g. export EDITOR=vim) or use the manual workflow:\n" +
          `    orfc pull ${slug} > plan.md\n` +
          "    # edit plan.md\n" +
          `    orfc push plan.md --update ${slug}\n`
      );
      process.exit(1);
    }

    const api = new ApiClient();
    const planId = await resolveSlug(api, slug);
    const plan = await api.getPlan(planId);

    // Write content to temp file
    const tmpFile = join(tmpdir(), `orfc-${slug}.md`);
    writeFileSync(tmpFile, plan.content, "utf-8");

    // Open in editor
    const result = spawnSync(editor, [tmpFile], {
      stdio: "inherit",
      shell: true,
    });

    if (result.status !== 0) {
      console.error("\n  ✗ Editor exited with non-zero status. Aborting.\n");
      try { unlinkSync(tmpFile); } catch {}
      process.exit(1);
    }

    // Read back
    const newContent = readFileSync(tmpFile, "utf-8");
    try { unlinkSync(tmpFile); } catch {}

    if (newContent === plan.content) {
      console.log("\n  No changes made.\n");
      return;
    }

    // Detect title from first heading
    const titleMatch = newContent.match(/^#\s+(.+?)(?:\n|$)/);
    const title = titleMatch ? titleMatch[1].trim() : plan.title;

    const updated = await api.updatePlan(planId, {
      content: newContent,
      title: title || undefined,
    });

    console.log(`\n  ✓ Updated: ${updated.url}\n`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n  ✗ ${message}\n`);
    process.exit(1);
  }
}
