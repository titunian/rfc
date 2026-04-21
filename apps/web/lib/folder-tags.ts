// Normalize a user-supplied folder path: lowercased, trimmed, no leading
// or trailing slashes, collapse duplicate slashes, strip any character
// outside [a-z0-9-_/]. "" represents the root.
export function normalizeFolderPath(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .toLowerCase()
    .trim()
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-z0-9\-_/]/g, "");
}

// Lowercase, hyphenate, deduplicate. Drops anything empty or non-ascii-safe.
export function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const cleaned = raw
    .map((t) => (typeof t === "string" ? t : ""))
    .map((t) => t.toLowerCase().trim().replace(/\s+/g, "-"))
    .map((t) => t.replace(/[^a-z0-9\-_]/g, ""))
    .filter(Boolean);
  return Array.from(new Set(cleaned));
}
