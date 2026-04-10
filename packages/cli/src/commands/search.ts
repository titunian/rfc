import { ApiClient } from "../lib/api";

export async function searchCommand(
  query: string,
  options: { tag?: string; status?: string; json?: boolean }
) {
  try {
    const api = new ApiClient();
    const data = await api.listPlans({
      q: query,
      tags: options.tag ? [options.tag] : undefined,
      status: options.status || undefined,
    });

    if (options.json) {
      console.log(JSON.stringify(data.plans || []));
      return;
    }

    if (!data.plans?.length) {
      console.log("\n  No results.\n");
      return;
    }

    console.log("");
    for (const plan of data.plans) {
      const tagsLabel =
        plan.tags && plan.tags.length ? ` [${plan.tags.join(", ")}]` : "";
      const statusLabel = plan.status ? ` (${plan.status})` : "";
      console.log(`  ${plan.slug}  ${plan.title || "Untitled"}${statusLabel}${tagsLabel}`);
    }
    console.log("");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.json) {
      console.error(JSON.stringify({ error: message }));
    } else {
      console.error(`\n  ✗ ${message}\n`);
    }
    process.exit(1);
  }
}
