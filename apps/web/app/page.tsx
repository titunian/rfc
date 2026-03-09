import { readLocalDB, isProductionDB, getDb } from "@/lib/db";
import { plans } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { AuthBar } from "@/components/auth-bar";

export const dynamic = "force-dynamic";

async function getPlans() {
  if (isProductionDB()) {
    const db = getDb();
    const rows = await db
      .select({
        id: plans.id,
        slug: plans.slug,
        title: plans.title,
        content: plans.content,
        createdAt: plans.createdAt,
      })
      .from(plans)
      .orderBy(desc(plans.createdAt))
      .limit(20);

    return rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  const localDb = readLocalDB();
  return localDb.plans
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 20);
}

export default async function Home() {
  const allPlans = await getPlans();

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-lg font-semibold tracking-tight">rfc</span>
            <span className="text-sm text-[var(--muted)] ml-2">
              Request for Comments
            </span>
          </div>
          <AuthBar />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Published RFCs
        </h1>
        <p className="text-[var(--muted)] mb-8">
          Publish from your terminal:{" "}
          <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">
            rfc push plan.md
          </code>
        </p>

        {allPlans.length === 0 ? (
          <div className="text-center py-20 text-[var(--muted)]">
            <p className="text-lg mb-4">No RFCs yet.</p>
            <pre className="inline-block bg-gray-900 text-gray-100 px-4 py-3 rounded-lg text-sm font-mono text-left">
              {`# Push your first RFC\nrfc push plan.md`}
            </pre>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {allPlans.map((plan) => (
              <a
                key={plan.id}
                href={`/p/${plan.slug}`}
                className="block py-4 hover:bg-gray-50 -mx-3 px-3 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">
                    {plan.title || "Untitled RFC"}
                  </h2>
                  <span className="text-xs text-[var(--muted)] shrink-0 ml-4">
                    {formatDate(plan.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-[var(--muted)] mt-1 line-clamp-1">
                  {plan.content.slice(0, 120).replace(/[#*`_\[\]]/g, "")}
                </p>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
