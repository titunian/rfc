import { NextRequest, NextResponse } from "next/server";
import {
  readLocalDB,
  isProductionDB,
  getDb,
} from "@/lib/db";
import { plans, planVersions } from "@/lib/schema";
import { getAuthUser, checkAccess } from "@/lib/auth";
import { computeDiff } from "@/lib/diff";
import { eq, and } from "drizzle-orm";

async function getVersionContent(
  planId: string,
  versionId: string
): Promise<string | null> {
  if (versionId === "current") return null; // handled by caller

  if (isProductionDB()) {
    const db = getDb();
    const [version] = await db
      .select({ content: planVersions.content })
      .from(planVersions)
      .where(
        and(
          eq(planVersions.planId, planId),
          eq(planVersions.id, versionId)
        )
      )
      .limit(1);
    return version?.content ?? null;
  }

  const localDb = readLocalDB();
  const version = localDb.planVersions.find(
    (v) => v.planId === planId && v.id === versionId
  );
  return version?.content ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = req.nextUrl;
  const fromId = searchParams.get("from");
  const toId = searchParams.get("to") || "current";

  if (!fromId) {
    return NextResponse.json(
      { error: "\"from\" query parameter is required" },
      { status: 400 }
    );
  }

  if (isProductionDB()) {
    const user = await getAuthUser(req);
    const db = getDb();

    const [plan] = await db
      .select({
        content: plans.content,
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

    const fromContent = await getVersionContent(params.id, fromId);
    if (fromContent === null) {
      return NextResponse.json({ error: "\"from\" version not found" }, { status: 404 });
    }

    const toContent = toId === "current"
      ? plan.content
      : await getVersionContent(params.id, toId);
    if (toContent === null) {
      return NextResponse.json({ error: "\"to\" version not found" }, { status: 404 });
    }

    try {
      return NextResponse.json({ diff: computeDiff(fromContent, toContent) });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 413 });
    }
  }

  // Local mode
  const localDb = readLocalDB();
  const plan = localDb.plans.find((p) => p.id === params.id);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const fromContent = await getVersionContent(params.id, fromId);
  if (fromContent === null) {
    return NextResponse.json({ error: "\"from\" version not found" }, { status: 404 });
  }

  const toContent = toId === "current"
    ? plan.content
    : await getVersionContent(params.id, toId);
  if (toContent === null) {
    return NextResponse.json({ error: "\"to\" version not found" }, { status: 404 });
  }

  try {
    return NextResponse.json({ diff: computeDiff(fromContent, toContent) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 413 });
  }
}
