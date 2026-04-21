import { NextRequest, NextResponse } from "next/server";
import {
  readLocalDB,
  writeLocalDB,
  isProductionDB,
  getDb,
} from "@/lib/db";
import { plans } from "@/lib/schema";
import { getAuthUser } from "@/lib/auth";
import { normalizeFolderPath, normalizeTags } from "@/lib/folder-tags";
import { desc, eq } from "drizzle-orm";
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
  const folderPath = normalizeFolderPath(body.folderPath);
  const tags = normalizeTags(body.tags);

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
        folderPath,
        tags,
        expiresAt,
      })
      .returning();

    return NextResponse.json({
      id: plan.id,
      slug: plan.slug,
      url: `${appUrl}/p/${plan.slug}`,
      title: plan.title,
      folderPath: plan.folderPath,
      tags: plan.tags,
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
    folderPath,
    tags,
    currentVersion: 1,
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
    folderPath: plan.folderPath,
    tags: plan.tags,
    createdAt: plan.createdAt,
  });
}

export async function GET(req: NextRequest) {
  // Filter hints from the query string. folder = "" selects the root;
  // omitting folder returns every plan across all folders.
  const url = new URL(req.url);
  const folderFilter = url.searchParams.has("folder")
    ? normalizeFolderPath(url.searchParams.get("folder"))
    : null;
  const tagFilter = url.searchParams.get("tag")?.toLowerCase().trim() || null;

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
        accessRule: plans.accessRule,
        folderPath: plans.folderPath,
        tags: plans.tags,
        createdAt: plans.createdAt,
        expiresAt: plans.expiresAt,
      })
      .from(plans)
      .where(eq(plans.authorEmail, user.email))
      .orderBy(desc(plans.createdAt));

    const filtered = rows.filter((r) => {
      if (folderFilter !== null && r.folderPath !== folderFilter) return false;
      if (tagFilter && !r.tags?.includes(tagFilter)) return false;
      return true;
    });

    return NextResponse.json({
      plans: filtered.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt?.toISOString() || null,
      })),
    });
  }

  // Local mode
  const localDb = readLocalDB();
  const localPlans = localDb.plans
    .filter((p) => {
      if (folderFilter !== null && (p.folderPath ?? "") !== folderFilter) return false;
      if (tagFilter && !(p.tags ?? []).includes(tagFilter)) return false;
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .map(({ id, slug, title, accessRule, folderPath, tags, createdAt, expiresAt }) => ({
      id,
      slug,
      title,
      accessRule,
      folderPath: folderPath ?? "",
      tags: tags ?? [],
      createdAt,
      expiresAt,
    }));

  return NextResponse.json({ plans: localPlans });
}
