import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { plans } from "@/lib/schema";

export async function POST() {
  try {
    const db = getDb();

    // Update all plans where accessRule = "anyone" to "authenticated"
    await db
      .update(plans)
      .set({ accessRule: "authenticated" })
      .where(eq(plans.accessRule, "anyone"));

    // Count total authenticated plans
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(plans)
      .where(eq(plans.accessRule, "authenticated"));

    return NextResponse.json({
      success: true,
      message: "Migration completed",
      totalAuthenticatedPlans: count,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
