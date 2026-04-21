import { NextRequest, NextResponse } from "next/server";
import {
  readLocalDB,
  isProductionDB,
  getDb,
} from "@/lib/db";
import { plans, planVersions } from "@/lib/schema";
import { getAuthUser, checkAccess } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

interface DiffLine {
  type: "add" | "remove" | "same";
  content: string;
  lineNumber?: number;
}

const MAX_DIFF_LINES = 5000;

// Simple line-based diff using longest common subsequence
function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  if (oldLines.length > MAX_DIFF_LINES || newLines.length > MAX_DIFF_LINES) {
    throw new Error("Document too large for diff (max 5000 lines per version)");
  }

  // LCS table
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({ type: "same", content: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: "add", content: newLines[j - 1] });
      j--;
    } else {
      result.push({ type: "remove", content: oldLines[i - 1] });
      i--;
    }
  }

  return result.reverse();
}

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
