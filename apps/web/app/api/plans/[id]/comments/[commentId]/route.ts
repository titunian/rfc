import { NextRequest, NextResponse } from "next/server";
import {
  readLocalDB,
  writeLocalDB,
  isProductionDB,
  getDb,
} from "@/lib/db";
import { comments, plans } from "@/lib/schema";
import { getAuthUser, checkAccess } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  const body = await req.json();
  const { resolved } = body;

  if (typeof resolved !== "boolean") {
    return NextResponse.json(
      { error: "resolved (boolean) is required" },
      { status: 400 }
    );
  }

  if (isProductionDB()) {
    const user = await getAuthUser(req);
    const db = getDb();

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

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = checkAccess(
      {
        accessRule: plan.accessRule,
        allowedViewers: plan.allowedViewers,
        authorEmail: plan.authorEmail,
      },
      user.email
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only plan author or comment author may resolve/unresolve
    const [existing] = await db
      .select({ authorEmail: comments.authorEmail })
      .from(comments)
      .where(and(eq(comments.id, params.commentId), eq(comments.planId, params.id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const isPlanAuthor = plan.authorEmail && user.email.toLowerCase() === plan.authorEmail.toLowerCase();
    const isCommentAuthor = existing.authorEmail && user.email.toLowerCase() === existing.authorEmail.toLowerCase();
    if (!isPlanAuthor && !isCommentAuthor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [updated] = await db
      .update(comments)
      .set({ resolved })
      .where(
        and(
          eq(comments.id, params.commentId),
          eq(comments.planId, params.id)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
    });
  }

  // Local mode
  const localDb = readLocalDB();
  const idx = localDb.comments.findIndex(
    (c) => c.id === params.commentId && c.planId === params.id
  );
  if (idx === -1) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  localDb.comments[idx].resolved = resolved;
  writeLocalDB(localDb);

  return NextResponse.json(localDb.comments[idx]);
}
