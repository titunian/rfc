import { NextResponse } from "next/server";
import { requireSession, generateApiKey } from "@/lib/auth";
import { getDb, isProductionDB } from "@/lib/db";
import { apiKeys } from "@/lib/schema";

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
    await db.insert(apiKeys).values({
      userEmail: email,
      keyHash: hash,
      keyPrefix: prefix,
      name: "CLI (rfc login)",
    });

    return NextResponse.json({ key, email });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
