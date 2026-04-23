import { cache } from "react";
import type { Metadata } from "next";
import { readLocalDB, isProductionDB, getDb } from "@/lib/db";
import { plans } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { checkAccess } from "@/lib/auth";
import { PlanView } from "@/components/plan-view";
import { extractDescription } from "@/lib/markdown-utils";

export const dynamic = "force-dynamic";

const getPlan = cache(async (slug: string) => {
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
      currentVersion: plan.currentVersion,
      createdAt: plan.createdAt.toISOString(),
      expiresAt: plan.expiresAt?.toISOString() || null,
    };
  }

  const localDb = readLocalDB();
  const found = localDb.plans.find((p) => p.slug === slug);
  return found || null;
});

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const plan = await getPlan(params.slug);

  if (!plan) {
    return { title: "Not Found — orfc" };
  }

  const isPublic = !plan.accessRule || plan.accessRule === "anyone";
  const url = `https://www.orfc.dev/p/${plan.slug}`;

  if (!isPublic) {
    return {
      title: "RFC — orfc",
      description: "A plan shared on orfc — sign in to view.",
      robots: { index: false, follow: false },
      alternates: { canonical: url },
    };
  }

  const title = plan.title ? `${plan.title} — orfc` : "Untitled Plan — orfc";

  const description = plan.content
    ? extractDescription(plan.content)
    : "A plan shared on orfc — open request for comments.";

  return {
    title,
    description,
    authors: plan.authorName ? [{ name: plan.authorName }] : undefined,
    openGraph: {
      title,
      description,
      url,
      siteName: "orfc",
      type: "article",
      ...(plan.authorName && { authors: [plan.authorName] }),
      ...(plan.createdAt && { publishedTime: plan.createdAt }),
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
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

  const isOwner = !!(userEmail && plan.authorEmail && userEmail === plan.authorEmail);

  return (
    <PlanView
      plan={{
        id: plan.id,
        slug: plan.slug,
        title: plan.title,
        content,
        authorName: plan.authorName,
        authorEmail: isOwner ? plan.authorEmail : null,
        accessRule: plan.accessRule || "authenticated",
        allowedViewers: isOwner ? plan.allowedViewers : null,
        currentVersion: plan.currentVersion,
        createdAt: plan.createdAt,
      }}
      serverAuthed={serverAuthed}
      isOwner={isOwner}
    />
  );
}
