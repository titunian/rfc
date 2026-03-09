import { ApiClient } from "../lib/api";

export async function commentsCommand(slugOrId: string) {
  try {
    const api = new ApiClient();

    // Find the plan ID from slug
    const data = await api.listPlans();
    const plan = data.plans?.find(
      (p: { slug: string; id: string }) =>
        p.slug === slugOrId || p.id === slugOrId
    );

    if (!plan) {
      console.error(`\n  ✗ RFC not found: ${slugOrId}\n`);
      process.exit(1);
    }

    const commentsData = await api.getComments(plan.id);
    const comments = commentsData.comments || [];

    if (comments.length === 0) {
      console.log(`\n  No comments on "${plan.title || "Untitled"}" yet.\n`);
      return;
    }

    console.log(
      `\n  Comments on "${plan.title || "Untitled"}" (${comments.length}):\n`
    );

    for (const c of comments) {
      const date = new Date(c.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      const resolved = c.resolved ? " [resolved]" : "";

      if (c.anchorText) {
        console.log(
          `  │ "${c.anchorText.slice(0, 60)}${c.anchorText.length > 60 ? "..." : ""}"`
        );
      }
      console.log(
        `  ${c.authorName} · ${date}${resolved}`
      );
      console.log(`  ${c.content}`);
      console.log("");
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n  ✗ ${message}\n`);
    process.exit(1);
  }
}
