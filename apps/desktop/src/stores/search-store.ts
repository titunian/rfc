import MiniSearch from "minisearch";

// ── Types ────────────────────────────────────────────────────────

export interface SearchDocument {
  id: string;
  title: string;
  content: string;
  tags: string; // space-separated
  slug: string;
}

export interface SearchResult {
  id: string;
  title: string;
  slug?: string;
  tags?: string[];
  score: number;
  match: Record<string, string[]>;
}

// ── MiniSearch config ────────────────────────────────────────────

const MS_OPTIONS = {
  fields: ["title", "content", "tags", "slug"],
  storeFields: ["title", "slug", "tags"],
  searchOptions: {
    boost: { title: 3, tags: 2, slug: 1.5 },
    prefix: true,
    fuzzy: 0.2,
  },
};

let ms = new MiniSearch<SearchDocument>(MS_OPTIONS);

/** Track which IDs are indexed so we can safely remove before re-add */
const indexed = new Set<string>();

// ── Public API ───────────────────────────────────────────────────

export function addDocument(doc: SearchDocument): void {
  if (indexed.has(doc.id)) {
    ms.discard(doc.id);
  }
  ms.add(doc);
  indexed.add(doc.id);
  schedulePersist();
}

export function removeDocument(id: string): void {
  if (!indexed.has(id)) return;
  ms.discard(id);
  indexed.delete(id);
  schedulePersist();
}

export function search(query: string): SearchResult[] {
  const raw = ms.search(query);
  return raw.map((r) => ({
    id: r.id as string,
    title: (r.title as string) ?? "",
    slug: (r.slug as string) ?? undefined,
    tags: r.tags ? (r.tags as string).split(/\s+/).filter(Boolean) : undefined,
    score: r.score,
    match: r.match,
  }));
}

// ── Persistence via tauri-plugin-fs ──────────────────────────────

const INDEX_DIR = ".orfc";
const INDEX_FILE = ".orfc/search-index.json";

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void doPersist();
  }, 2000);
}

async function doPersist(): Promise<void> {
  try {
    const { mkdir, writeTextFile, BaseDirectory } = await import(
      "@tauri-apps/plugin-fs"
    );
    await mkdir(INDEX_DIR, {
      baseDir: BaseDirectory.Home,
      recursive: true,
    }).catch(() => {});
    const json = JSON.stringify(ms.toJSON());
    await writeTextFile(INDEX_FILE, json, {
      baseDir: BaseDirectory.Home,
    });
  } catch (e) {
    console.warn("[search] persist failed", e);
  }
}

export async function loadPersistedIndex(): Promise<void> {
  try {
    const { readTextFile, BaseDirectory } = await import(
      "@tauri-apps/plugin-fs"
    );
    const json = await readTextFile(INDEX_FILE, {
      baseDir: BaseDirectory.Home,
    });
    const restored = MiniSearch.loadJSON<SearchDocument>(json, MS_OPTIONS);
    ms = restored;
    indexed.clear();
    // We don't know which IDs are in the restored index, but addDocument
    // handles the discard-before-add pattern, so it's safe. The indexed set
    // will be repopulated as fetchPlans/openFile re-indexes docs.
    console.info("[search] persisted index loaded");
  } catch {
    // No persisted index yet — that's fine.
  }
}
