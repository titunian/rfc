import { NextRequest, NextResponse } from "next/server";
import {
  readLocalDB,
  isProductionDB,
  getDb,
} from "@/lib/db";
import { plans, planVersions } from "@/lib/schema";
import { getAuthUser, checkAccess } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (isProductionDB()) {
    const user = await getAuthUser(req);
    const db = getDb();

    // Check plan exists and user has access
    const [plan] = await db
      .select({
        accessRule: plans.accessRule,
        allowedViewers: plans.allowedViewers,
        authorEmail: plans.authorEmail,
        currentVersion: plans.currentVersion,
      })
      .from(plans)
      .where(eq(plans.id, params.id))
      .limit(1);

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const hasAccess = checkAccess(
      { accessRule: plan.accessRule, allowedViewers: plan.allowedViewers, authorEmail: plan.authorEmail },
      user?.email || null
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select({
        id: planVersions.id,
        version: planVersions.version,
        title: planVersions.title,
        authorEmail: planVersions.authorEmail,
        createdAt: planVersions.createdAt,
      })
      .from(planVersions)
      .where(eq(planVersions.planId, params.id))
      .orderBy(desc(planVersions.version));

    return NextResponse.json({
      currentVersion: plan.currentVersion,
      versions: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  }

  // Local mode
  const localDb = readLocalDB();
  const plan = localDb.plans.find((p) => p.id === params.id);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const versions = localDb.planVersions
    .filter((v) => v.planId === params.id)
    .sort((a, b) => b.version - a.version)
    .map(({ id, version, title, authorEmail, createdAt }) => ({
      id,
      version,
      title,
      authorEmail,
      createdAt,
    }));

  return NextResponse.json({
    currentVersion: plan.currentVersion || 1,
    versions,
  });
}
