import { NextRequest, NextResponse } from "next/server";
import {
  readLocalDB,
  writeLocalDB,
  isProductionDB,
  getDb,
} from "@/lib/db";
import { plans } from "@/lib/schema";
import { getAuthUser } from "@/lib/auth";
import { extractTags } from "@/lib/extract-tags";
import { desc, eq, sql, and } from "drizzle-orm";
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
  const tags: string[] = body.tags ?? extractTags(content || "");
  const status: string | undefined = body.status;

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
        tags: JSON.stringify(tags),
        ...(status ? { status } : {}),
        expiresAt,
      })
      .returning();

    return NextResponse.json({
      id: plan.id,
      slug: plan.slug,
      url: `${appUrl}/p/${plan.slug}`,
      title: plan.title,
      tags: JSON.parse(plan.tags || "[]"),
      status: plan.status,
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
    tags: JSON.stringify(tags),
    status: status || "draft",
    statusChangedAt: null as string | null,
    statusChangedBy: null as string | null,
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
    tags: JSON.parse(plan.tags || "[]"),
    status: plan.status,
    createdAt: plan.createdAt,
  });
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || undefined;
  const tagsParam = req.nextUrl.searchParams.get("tags") || undefined;
  const statusParam = req.nextUrl.searchParams.get("status") || undefined;

  let filterTags: string[] | undefined;
  if (tagsParam) {
    try {
      filterTags = JSON.parse(tagsParam);
    } catch {
      filterTags = undefined;
    }
  }

  if (isProductionDB()) {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    const conditions = [eq(plans.authorEmail, user.email)];
    if (q) {
      conditions.push(
        sql`plans.search_vector @@ plainto_tsquery('english', ${q})`
      );
    }
    if (filterTags && filterTags.length > 0) {
      conditions.push(
        sql`plans.tags::jsonb @> ${JSON.stringify(filterTags)}::jsonb`
      );
    }
    if (statusParam) {
      conditions.push(eq(plans.status, statusParam));
    }

    const rows = await db
      .select({
        id: plans.id,
        slug: plans.slug,
        title: plans.title,
        tags: plans.tags,
        status: plans.status,
        accessRule: plans.accessRule,
        createdAt: plans.createdAt,
        expiresAt: plans.expiresAt,
      })
      .from(plans)
      .where(and(...conditions))
      .orderBy(desc(plans.createdAt));

    return NextResponse.json({
      plans: rows.map((r) => ({
        ...r,
        tags: JSON.parse(r.tags || "[]"),
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt?.toISOString() || null,
      })),
    });
  }

  // Local mode
  const localDb = readLocalDB();
  let filtered = localDb.plans;

  if (q) {
    const lower = q.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        (p.title || "").toLowerCase().includes(lower) ||
        p.content.toLowerCase().includes(lower)
    );
  }
  if (filterTags && filterTags.length > 0) {
    filtered = filtered.filter((p) => {
      const planTags: string[] = JSON.parse(p.tags || "[]");
      return filterTags!.every((t) => planTags.includes(t));
    });
  }
  if (statusParam) {
    filtered = filtered.filter(
      (p) => p.status === statusParam
    );
  }

  const localPlans = filtered
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .map(({ id, slug, title, accessRule, createdAt, expiresAt, tags, status }) => ({
      id,
      slug,
      title,
      tags: JSON.parse(tags || "[]"),
      status: status || "draft",
      accessRule,
      createdAt,
      expiresAt,
    }));

  return NextResponse.json({ plans: localPlans });
}
