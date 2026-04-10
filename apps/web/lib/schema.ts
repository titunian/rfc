import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

export const plans = pgTable("plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title"),
  content: text("content").notNull(),
  authorName: text("author_name"),
  authorEmail: text("author_email"),
  accessRule: text("access_rule").default("authenticated").notNull(),
  allowedViewers: text("allowed_viewers"),  // comma-separated emails or @domain patterns
  currentVersion: integer("current_version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  expiresAt: timestamp("expires_at"),
});

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  authorName: text("author_name").notNull(),
  authorEmail: text("author_email"),
  content: text("content").notNull(),
  anchorText: text("anchor_text"),
  anchorBlockIndex: integer("anchor_block_index"),
  anchorOffsetStart: integer("anchor_offset_start"),
  anchorOffsetEnd: integer("anchor_offset_end"),
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const planVersions = pgTable("plan_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  title: text("title"),
  content: text("content").notNull(),
  authorEmail: text("author_email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const verificationCodes = pgTable("verification_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userEmail: text("user_email").notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
