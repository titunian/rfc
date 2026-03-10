import { NextRequest, NextResponse } from "next/server";
import {
  readLocalDB,
  writeLocalDB,
  isProductionDB,
  getDb,
} from "@/lib/db";
import { plans } from "@/lib/schema";
import { getAuthUser } from "@/lib/auth";
import { desc } from "drizzle-orm";
import { randomUUID } from "crypto";

function nanoid(len: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function parseExpiry(expiresIn: string | undefined): Date | null {
  if (!expiresIn) return null;
  const match = expiresIn.match(/^(\d+)([dhm])$/);
  if (!match) return null;
  const [, amount, unit] = match;
  const ms: Record<string, number> = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return new Date(Date.now() + parseInt(amount) * ms[unit]);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, content, accessRule, allowedViewers, expiresIn } = body;

  if (!content) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 }
    );
  }

  const slug = nanoid(10);
  const appUrl = (process.env.APP_URL || req.nextUrl.origin).trim();
  const expiresAt = parseExpiry(expiresIn);

  if (isProductionDB()) {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const [plan] = await db
      .insert(plans)
      .values({
        slug,
        title: title || "Untitled RFC",
        content,
        authorName: user.name || null,
        authorEmail: user.email,
        accessRule: accessRule || "authenticated",
        allowedViewers: allowedViewers || null,
        expiresAt,
      })
      .returning();

    return NextResponse.json({
      id: plan.id,
      slug: plan.slug,
      url: `${appUrl}/p/${plan.slug}`,
      title: plan.title,
      createdAt: plan.createdAt.toISOString(),
    });
  }

  // Local mode — JSON file
  const plan = {
    id: randomUUID(),
    slug,
    title: title || "Untitled RFC",
    content,
    authorName: null as string | null,
    authorEmail: null as string | null,
    accessRule: accessRule || "authenticated",
    allowedViewers: allowedViewers || null,
    slackChannelId: null as string | null,
    slackMessageTs: null as string | null,
    createdAt: new Date().toISOString(),
    updatedAt: null as string | null,
    expiresAt: expiresAt?.toISOString() || null,
  };

  const localDb = readLocalDB();
  localDb.plans.push(plan);
  writeLocalDB(localDb);

  return NextResponse.json({
    id: plan.id,
    slug: plan.slug,
    url: `${appUrl}/p/${plan.slug}`,
    title: plan.title,
    createdAt: plan.createdAt,
  });
}

export async function GET(req: NextRequest) {
  if (isProductionDB()) {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const rows = await db
      .select({
        id: plans.id,
        slug: plans.slug,
        title: plans.title,
        createdAt: plans.createdAt,
        expiresAt: plans.expiresAt,
      })
      .from(plans)
      .orderBy(desc(plans.createdAt));

    return NextResponse.json({
      plans: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt?.toISOString() || null,
      })),
    });
  }

  // Local mode
  const localDb = readLocalDB();
  const localPlans = localDb.plans
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .map(({ id, slug, title, createdAt, expiresAt }) => ({
      id,
      slug,
      title,
      createdAt,
      expiresAt,
    }));

  return NextResponse.json({ plans: localPlans });
}
