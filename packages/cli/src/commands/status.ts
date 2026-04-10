import { ApiClient } from "../lib/api";

const VALID_STATUSES = ["draft", "review", "approved", "executing", "done"];

function resolveSlug(api: ApiClient, slug: string): Promise<{ id: string; slug: string }> {
  return api.listPlans().then(({ plans }) => {
    const match = plans.find((p) => p.slug === slug);
    if (!match) throw new Error(`Plan not found: ${slug}`);
    return match;
  });
}

export async function statusCommand(
  slug: string,
  newStatus: string | undefined,
  options: { json?: boolean }
) {
  try {
    const api = new ApiClient();
    const match = await resolveSlug(api, slug);

    if (newStatus) {
      if (!VALID_STATUSES.includes(newStatus)) {
        const msg = `Invalid status: ${newStatus}. Valid: ${VALID_STATUSES.join(", ")}`;
        if (options.json) {
          console.error(JSON.stringify({ error: msg }));
        } else {
          console.error(`  ✗ ${msg}`);
        }
        process.exit(1);
      }

      const updated = await api.updatePlan(match.id, { status: newStatus });

      if (options.json) {
        console.log(
          JSON.stringify({
            slug: updated.slug,
            status: updated.status || newStatus,
          })
        );
      } else {
        console.log(`\n  ✓ ${slug}: ${newStatus}\n`);
      }
    } else {
      const plan = await api.getPlan(match.id);

      if (options.json) {
        console.log(
          JSON.stringify({
            slug: plan.slug,
            title: plan.title,
            status: (plan as any).status || null,
            tags: (plan as any).tags || [],
          })
        );
      } else {
        const status = (plan as any).status || "unknown";
        console.log(`\n  ${slug}: ${status}\n`);
      }
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
