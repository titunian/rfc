import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// --- Drizzle client (used when DATABASE_URL is set) ---

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Set it in .env.local or use the JSON file fallback for local dev."
    );
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}

// --- JSON file fallback for local development ---

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), ".data");
const DB_FILE = join(DATA_DIR, "db.json");

export interface LocalPlan {
  id: string;
  slug: string;
  title: string | null;
  content: string;
  authorName: string | null;
  authorEmail: string | null;
  accessRule: string;
  allowedViewers: string | null;
  createdAt: string;
  updatedAt: string | null;
  expiresAt: string | null;
}

export interface LocalComment {
  id: string;
  planId: string;
  authorName: string;
  authorEmail: string | null;
  content: string;
  anchorText: string | null;
  anchorBlockIndex: number | null;
  anchorOffsetStart: number | null;
  anchorOffsetEnd: number | null;
  resolved: boolean;
  createdAt: string;
}

interface LocalDB {
  plans: LocalPlan[];
  comments: LocalComment[];
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readLocalDB(): LocalDB {
  ensureDir();
  if (!existsSync(DB_FILE)) {
    return { plans: [], comments: [] };
  }
  try {
    return JSON.parse(readFileSync(DB_FILE, "utf-8"));
  } catch {
    return { plans: [], comments: [] };
  }
}

export function writeLocalDB(db: LocalDB) {
  ensureDir();
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Helper to check if we're in production (Postgres) mode
export function isProductionDB(): boolean {
  return !!process.env.DATABASE_URL;
}
