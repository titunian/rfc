import { NextResponse } from "next/server";
import { requireSession, generateApiKey } from "@/lib/auth";
import { getDb, isProductionDB } from "@/lib/db";
import { apiKeys, users, loginEvents } from "@/lib/schema";

export async function POST() {
  if (!isProductionDB()) {
    return NextResponse.json(
      { error: "API keys require production database" },
      { status: 400 }
    );
  }

  try {
    const session = await requireSession();
    const email = session.user!.email!;

    const { key, hash, prefix } = generateApiKey();

    const db = getDb();
    await Promise.all([
      db.insert(apiKeys).values({
        userEmail: email,
        keyHash: hash,
        keyPrefix: prefix,
        name: "CLI (rfc login)",
      }),
      db
        .insert(users)
        .values({ email, name: email.split("@")[0] })
        .onConflictDoUpdate({
          target: users.email,
          set: { lastLoginAt: new Date() },
        }),
      db.insert(loginEvents).values({ email, method: "cli" }),
    ]);

    return NextResponse.json({ key, email });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
