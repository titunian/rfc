import { NextRequest, NextResponse } from "next/server";
import {
  readLocalDB,
  writeLocalDB,
  isProductionDB,
  getDb,
} from "@/lib/db";
import { plans } from "@/lib/schema";
import { getAuthUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (isProductionDB()) {
    const db = getDb();
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, params.id))
      .limit(1);

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    if (plan.expiresAt && plan.expiresAt < new Date()) {
      return NextResponse.json({ error: "Plan has expired" }, { status: 410 });
    }

    return NextResponse.json({
      ...plan,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt?.toISOString() || null,
      expiresAt: plan.expiresAt?.toISOString() || null,
    });
  }

  // Local mode
  const localDb = readLocalDB();
  const plan = localDb.plans.find((p) => p.id === params.id);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  if (plan.expiresAt && new Date(plan.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Plan has expired" }, { status: 410 });
  }
  return NextResponse.json(plan);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  if (isProductionDB()) {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // Verify ownership
    const [existing] = await db
      .select({ authorEmail: plans.authorEmail })
      .from(plans)
      .where(eq(plans.id, params.id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    if (existing.authorEmail !== user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (body.title !== undefined) updates.title = body.title;
    if (body.content !== undefined) updates.content = body.content;
    if (body.accessRule !== undefined) updates.accessRule = body.accessRule;

    const [plan] = await db
      .update(plans)
      .set(updates)
      .where(eq(plans.id, params.id))
      .returning();

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const appUrl = (process.env.APP_URL || req.nextUrl.origin).trim();
    return NextResponse.json({
      id: plan.id,
      slug: plan.slug,
      url: `${appUrl}/p/${plan.slug}`,
      title: plan.title,
      updatedAt: plan.updatedAt?.toISOString(),
    });
  }

  // Local mode
  const localDb = readLocalDB();
  const plan = localDb.plans.find((p) => p.id === params.id);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  if (body.title !== undefined) plan.title = body.title;
  if (body.content !== undefined) plan.content = body.content;
  plan.updatedAt = new Date().toISOString();
  writeLocalDB(localDb);

  const appUrl = (process.env.APP_URL || req.nextUrl.origin).trim();
  return NextResponse.json({
    id: plan.id,
    slug: plan.slug,
    url: `${appUrl}/p/${plan.slug}`,
    title: plan.title,
    updatedAt: plan.updatedAt,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (isProductionDB()) {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // Verify ownership
    const [existing] = await db
      .select({ authorEmail: plans.authorEmail })
      .from(plans)
      .where(eq(plans.id, params.id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    if (existing.authorEmail !== user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [deleted] = await db
      .delete(plans)
      .where(eq(plans.id, params.id))
      .returning({ id: plans.id });

    if (!deleted) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  }

  // Local mode
  const localDb = readLocalDB();
  const idx = localDb.plans.findIndex((p) => p.id === params.id);
  if (idx === -1) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  localDb.plans.splice(idx, 1);
  localDb.comments = localDb.comments.filter((c) => c.planId !== params.id);
  writeLocalDB(localDb);
  return NextResponse.json({ deleted: true });
}
