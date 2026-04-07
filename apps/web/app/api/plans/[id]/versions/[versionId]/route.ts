import { NextRequest, NextResponse } from "next/server";
import {
  readLocalDB,
  isProductionDB,
  getDb,
} from "@/lib/db";
import { plans, planVersions } from "@/lib/schema";
import { getAuthUser, checkAccess } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; versionId: string } }
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

    const [version] = await db
      .select()
      .from(planVersions)
      .where(
        and(
          eq(planVersions.planId, params.id),
          eq(planVersions.id, params.versionId)
        )
      )
      .limit(1);

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...version,
      createdAt: version.createdAt.toISOString(),
    });
  }

  // Local mode
  const localDb = readLocalDB();
  const plan = localDb.plans.find((p) => p.id === params.id);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const version = localDb.planVersions.find(
    (v) => v.planId === params.id && v.id === params.versionId
  );
  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  return NextResponse.json(version);
}
