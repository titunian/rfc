import { ApiClient } from "../lib/api";
import { loadConfig } from "../lib/config";

export async function listCommand(options: {
  search?: string;
  tag?: string;
  status?: string;
  json?: boolean;
}) {
  try {
    const api = new ApiClient();
    const config = loadConfig();
    const data = await api.listPlans({
      q: options.search || undefined,
      tags: options.tag ? [options.tag] : undefined,
      status: options.status || undefined,
    });

    if (options.json) {
      console.log(JSON.stringify(data.plans || []));
      return;
    }

    if (!data.plans?.length) {
      console.log("\n  No plans found.\n");
      return;
    }

    console.log(`\n  Your plans (${data.plans.length}):\n`);

    for (const plan of data.plans) {
      const date = new Date(plan.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const expired =
        plan.expiresAt && new Date(plan.expiresAt) < new Date();
      const expiredLabel = expired ? " [expired]" : "";
      const statusLabel = plan.status ? ` [${plan.status}]` : "";
      const tagsLabel =
        plan.tags && plan.tags.length ? ` (${plan.tags.join(", ")})` : "";
      const url = `${config.apiUrl}/p/${plan.slug}`;

      console.log(
        `  ${date}  ${plan.title || "Untitled"}${statusLabel}${tagsLabel}${expiredLabel}`
      );
      console.log(`         ${url}`);
      console.log("");
    }
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
