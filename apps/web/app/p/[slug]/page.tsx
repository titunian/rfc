import { readLocalDB, isProductionDB, getDb } from "@/lib/db";
import { plans } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { checkAccess } from "@/lib/auth";
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
      allowedViewers: plan.allowedViewers,
      createdAt: plan.createdAt.toISOString(),
      expiresAt: plan.expiresAt?.toISOString() || null,
    };
  }

  const localDb = readLocalDB();
  const found = localDb.plans.find((p) => p.slug === slug);
  return found || null;
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

  // Server-side access check
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email || null;

  const serverAuthed = checkAccess(
    {
      accessRule: plan.accessRule,
      allowedViewers: plan.allowedViewers,
      authorEmail: plan.authorEmail,
    },
    userEmail
  );

  // Truncate content server-side so unauthorized users can't inspect full text
  const content = serverAuthed ? plan.content : plan.content.slice(0, 600);

  return (
    <PlanView
      plan={{
        id: plan.id,
        slug: plan.slug,
        title: plan.title,
        content,
        authorName: plan.authorName,
        authorEmail: plan.authorEmail,
        accessRule: plan.accessRule || "authenticated",
        allowedViewers: plan.allowedViewers,
        createdAt: plan.createdAt,
      }}
      serverAuthed={serverAuthed}
    />
  );
}
