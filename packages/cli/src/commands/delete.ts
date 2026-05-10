import * as readline from "readline";
import { ApiClient } from "../lib/api";

function confirm(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

export async function deleteCommand(slugOrId: string, options: { force?: boolean } = {}) {
  try {
    const api = new ApiClient();

    const data = await api.listPlans();
    const plan = data.plans?.find(
      (p: { slug: string; id: string }) =>
        p.slug === slugOrId || p.id === slugOrId
    );

    if (!plan) {
      console.error(`\n  ✗ RFC not found: ${slugOrId}\n`);
      process.exit(1);
    }

    if (!options.force) {
      const ok = await confirm(`\n  Delete "${plan.title || "Untitled"}" (${plan.slug})? This cannot be undone. [y/N] `);
      if (!ok) {
        console.log("\n  Cancelled.\n");
        return;
      }
    }

    await api.deletePlan(plan.id);
    console.log(`\n  ✓ Deleted: ${plan.title || "Untitled"}\n`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n  ✗ ${message}\n`);
    process.exit(1);
  }
}
