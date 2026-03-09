import { readLocalDB, isProductionDB, getDb } from "@/lib/db";
import { plans } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PlanView } from "@/components/plan-view";

export const dynamic = "force-dynamic";

async function getPlan(slug: string) {
  if (isProductionDB()) {
    const db = getDb();
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.slug, slug))
      .limit(1);
    if (!plan) return null;
    return {
      id: plan.id,
      slug: plan.slug,
      title: plan.title,
      content: plan.content,
      authorName: plan.authorName,
      authorEmail: plan.authorEmail,
      accessRule: plan.accessRule,
      createdAt: plan.createdAt.toISOString(),
      expiresAt: plan.expiresAt?.toISOString() || null,
    };
  }

  const localDb = readLocalDB();
  return localDb.plans.find((p) => p.slug === slug) || null;
}

export default async function PlanPage({
  params,
}: {
  params: { slug: string };
}) {
  const plan = await getPlan(params.slug);
  if (!plan) notFound();

  if (plan.expiresAt && new Date(plan.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">RFC Expired</h1>
          <p className="text-[var(--muted)]">
            This RFC is no longer available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PlanView
      plan={{
        id: plan.id,
        slug: plan.slug,
        title: plan.title,
        content: plan.content,
        authorName: plan.authorName,
        authorEmail: plan.authorEmail,
        accessRule: plan.accessRule || "anyone",
        createdAt: plan.createdAt,
      }}
    />
  );
}
