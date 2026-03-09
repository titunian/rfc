import { ApiClient } from "../lib/api";

export async function deleteCommand(slugOrId: string) {
  try {
    const api = new ApiClient();

    // The API uses plan IDs, but users will pass slugs.
    // For now, list plans and find the matching one.
    const data = await api.listPlans();
    const plan = data.plans?.find(
      (p: { slug: string; id: string }) =>
        p.slug === slugOrId || p.id === slugOrId
    );

    if (!plan) {
      console.error(`\n  ✗ RFC not found: ${slugOrId}\n`);
      process.exit(1);
    }

    await api.deletePlan(plan.id);
    console.log(`\n  ✓ Deleted: ${plan.title || "Untitled"}\n`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n  ✗ ${message}\n`);
    process.exit(1);
  }
}
