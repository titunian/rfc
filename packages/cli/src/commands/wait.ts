import { ApiClient } from "../lib/api";

function resolveSlug(api: ApiClient, slug: string): Promise<{ id: string; slug: string }> {
  return api.listPlans().then(({ plans }) => {
    const match = plans.find((p) => p.slug === slug);
    if (!match) throw new Error(`Plan not found: ${slug}`);
    return match;
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitCommand(
  slug: string,
  options: { for: string; timeout?: string; json?: boolean }
) {
  const targetStatus = options.for;
  if (!targetStatus) {
    const msg = "Missing --for <status>";
    if (options.json) {
      console.error(JSON.stringify({ error: msg }));
    } else {
      console.error(`  ✗ ${msg}`);
    }
    process.exit(1);
  }

  const timeoutSec = options.timeout ? parseInt(options.timeout, 10) : 300;
  const pollInterval = 5000; // 5 seconds
  const deadline = Date.now() + timeoutSec * 1000;

  try {
    const api = new ApiClient();
    const match = await resolveSlug(api, slug);

    while (Date.now() < deadline) {
      const plan = await api.getPlan(match.id);
      const currentStatus = (plan as any).status;

      if (currentStatus === targetStatus) {
        if (options.json) {
          console.log(
            JSON.stringify({
              slug: plan.slug,
              title: plan.title,
              status: currentStatus,
              tags: (plan as any).tags || [],
            })
          );
        } else {
          console.log(`\n  ✓ ${slug}: ${currentStatus}\n`);
        }
        process.exit(0);
      }

      if (!options.json) {
        process.stderr.write(`  … ${slug}: ${currentStatus || "unknown"}, waiting for ${targetStatus}\n`);
      }

      await sleep(pollInterval);
    }

    // Timeout
    const msg = `Timed out after ${timeoutSec}s waiting for ${slug} to reach "${targetStatus}"`;
    if (options.json) {
      console.error(JSON.stringify({ error: msg, timeout: true }));
    } else {
      console.error(`\n  ✗ ${msg}\n`);
    }
    process.exit(1);
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
