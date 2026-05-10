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
  const key = `orfc_${raw}`;
  const hash = createHash("sha256").update(key).digest("hex");
  const prefix = key.slice(0, 8);
  return { key, hash, prefix };
}

export async function validateApiKey(
  authHeader: string | null
): Promise<{ email: string } | null> {
  // Accept both orfc_ and legacy rfc_ prefixed keys
  const hasValidPrefix =
    authHeader?.startsWith("Bearer orfc_") ||
    authHeader?.startsWith("Bearer rfc_");
  if (!hasValidPrefix) return null;
  if (!isProductionDB()) return null;

  const key = authHeader!.slice(7); // Remove "Bearer "
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

/**
 * Check if a user can access a plan.
 *
 * Access logic:
 *  1. accessRule "anyone" → public, no auth needed
 *  2. If allowedViewers is set → user must be logged in AND email must match
 *     Supports "@domain.com" patterns and specific "user@example.com" entries
 *     Plan author always has access
 *  3. accessRule "authenticated" → any logged-in user
 */
export function checkAccess(
  {
    accessRule,
    allowedViewers,
    authorEmail,
  }: {
    accessRule: string;
    allowedViewers?: string | null;
    authorEmail?: string | null;
  },
  userEmail: string | null | undefined
): boolean {
  if (!accessRule || accessRule === "anyone") return true;
  if (!userEmail) return false;

  const email = userEmail.toLowerCase();

  // Author always has access to their own plan
  if (authorEmail && email === authorEmail.toLowerCase()) return true;

  // If allowedViewers is set, restrict to those patterns
  if (allowedViewers !== undefined && allowedViewers !== null) {
    const patterns = allowedViewers
      .split(",")
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);

    // Empty viewer list with a non-public accessRule means nobody except the author
    if (patterns.length === 0) return false;

    return patterns.some((pattern) => {
      if (pattern.startsWith("@")) {
        // Domain pattern: "@pavoai.com"
        return email.endsWith(pattern);
      }
      // Exact email match
      return email === pattern;
    });
  }

  // "authenticated" — any logged-in user
  return true;
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
