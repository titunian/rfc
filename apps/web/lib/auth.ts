import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { createHash, randomBytes } from "crypto";
import { getDb, isProductionDB } from "./db";
import { apiKeys } from "./schema";
import { eq } from "drizzle-orm";

// --- Session helpers ---

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }
  return session;
}

// --- API key helpers ---

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const raw = randomBytes(24).toString("base64url");
  const key = `rfc_${raw}`;
  const hash = createHash("sha256").update(key).digest("hex");
  const prefix = key.slice(0, 8);
  return { key, hash, prefix };
}

export async function validateApiKey(
  authHeader: string | null
): Promise<{ email: string } | null> {
  if (!authHeader?.startsWith("Bearer rfc_")) return null;
  if (!isProductionDB()) return null;

  const key = authHeader.slice(7); // Remove "Bearer "
  const hash = createHash("sha256").update(key).digest("hex");

  const db = getDb();
  const rows = await db
    .select({ userEmail: apiKeys.userEmail })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hash))
    .limit(1);

  if (rows.length === 0) return null;
  return { email: rows[0].userEmail };
}

// --- Access control ---

export function checkAccess(
  accessRule: string,
  userEmail: string | null | undefined
): boolean {
  if (!accessRule || accessRule === "anyone") return true;
  if (!userEmail) return false;

  // Domain-based: "@company.com"
  if (accessRule.startsWith("@")) {
    return userEmail.endsWith(accessRule);
  }

  // Comma-separated emails
  const allowed = accessRule.split(",").map((e) => e.trim().toLowerCase());
  return allowed.includes(userEmail.toLowerCase());
}

// --- Get authenticated user from either session or API key ---

export async function getAuthUser(
  request: Request
): Promise<{ email: string; name?: string | null } | null> {
  // Try API key first (for CLI)
  const authHeader = request.headers.get("authorization");
  const apiKeyUser = await validateApiKey(authHeader);
  if (apiKeyUser) return apiKeyUser;

  // Try NextAuth session (for browser)
  const session = await getSession();
  if (session?.user?.email) {
    return { email: session.user.email, name: session.user.name };
  }

  return null;
}
