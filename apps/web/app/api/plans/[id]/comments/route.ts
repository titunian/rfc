import { NextRequest, NextResponse } from "next/server";
import {
  readLocalDB,
  writeLocalDB,
  isProductionDB,
  getDb,
} from "@/lib/db";
import { comments, plans } from "@/lib/schema";
import { getAuthUser } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (isProductionDB()) {
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
    // In production, require auth to comment
    const name = user?.name || authorName || "Anonymous";
    const email = user?.email || null;

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
