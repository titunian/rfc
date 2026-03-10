import { ApiClient } from "../lib/api";
import { loadConfig } from "../lib/config";

export async function listCommand() {
  try {
    const api = new ApiClient();
    const config = loadConfig();
    const data = await api.listPlans();

    if (!data.plans?.length) {
      console.log("\n  No plans published yet.\n");
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
      const status = expired ? " [expired]" : "";
      const url = `${config.apiUrl}/p/${plan.slug}`;

      console.log(
        `  ${date}  ${plan.title || "Untitled"}${status}`
      );
      console.log(`         ${url}`);
      console.log("");
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n  ✗ ${message}\n`);
    process.exit(1);
  }
}
