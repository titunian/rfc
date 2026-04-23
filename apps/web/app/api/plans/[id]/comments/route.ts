import { NextRequest, NextResponse } from "next/server";
import {
  readLocalDB,
  writeLocalDB,
  isProductionDB,
  getDb,
} from "@/lib/db";
import { comments, plans } from "@/lib/schema";
import { getAuthUser, checkAccess } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

async function getPlanAccess(planId: string, userEmail: string | null) {
  if (!isProductionDB()) return true;

  const db = getDb();
  const [plan] = await db
    .select({
      accessRule: plans.accessRule,
      allowedViewers: plans.allowedViewers,
      authorEmail: plans.authorEmail,
    })
    .from(plans)
    .where(eq(plans.id, planId))
    .limit(1);

  if (!plan) return false;

  return checkAccess(
    {
      accessRule: plan.accessRule,
      allowedViewers: plan.allowedViewers,
      authorEmail: plan.authorEmail,
    },
    userEmail
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (isProductionDB()) {
    // Check access
    const user = await getAuthUser(req);
    const hasAccess = await getPlanAccess(params.id, user?.email || null);
    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const rows = await db
      .select()
      .from(comments)
      .where(eq(comments.planId, params.id))
      .orderBy(asc(comments.createdAt));

    return NextResponse.json({
      comments: rows.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  }

  // Local mode
  const localDb = readLocalDB();
  const localComments = localDb.comments
    .filter((c) => c.planId === params.id)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  return NextResponse.json({ comments: localComments });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const {
    content,
    authorName,
    parentId,
    anchorText,
    anchorBlockIndex,
    anchorOffsetStart,
    anchorOffsetEnd,
  } = body;

  if (!content) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 }
    );
  }

  if (isProductionDB()) {
    const user = await getAuthUser(req);

    // Check access before allowing comment
    const hasAccess = await getPlanAccess(params.id, user?.email || null);
    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = user?.email || null;
    // Authenticated users use their email; anonymous users get a fixed label
    const name = email || "Anonymous";

    const db = getDb();

    // Verify plan exists
    const [plan] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.id, params.id))
      .limit(1);

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const [comment] = await db
      .insert(comments)
      .values({
        planId: params.id,
        parentId: parentId || null,
        authorName: name,
        authorEmail: email,
        content,
        anchorText: anchorText || null,
        anchorBlockIndex: anchorBlockIndex ?? null,
        anchorOffsetStart: anchorOffsetStart ?? null,
        anchorOffsetEnd: anchorOffsetEnd ?? null,
      })
      .returning();

    return NextResponse.json({
      ...comment,
      createdAt: comment.createdAt.toISOString(),
    });
  }

  // Local mode
  const localDb = readLocalDB();
  const plan = localDb.plans.find((p) => p.id === params.id);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const comment = {
    id: randomUUID(),
    planId: params.id,
    parentId: (parentId as string) || null,
    authorName: authorName || "Anonymous",
    authorEmail: null as string | null,
    content,
    anchorText: anchorText || null,
    anchorBlockIndex: anchorBlockIndex ?? null,
    anchorOffsetStart: anchorOffsetStart ?? null,
    anchorOffsetEnd: anchorOffsetEnd ?? null,
    resolved: false,
    createdAt: new Date().toISOString(),
  };

  localDb.comments.push(comment);
  writeLocalDB(localDb);

  return NextResponse.json(comment);
}
