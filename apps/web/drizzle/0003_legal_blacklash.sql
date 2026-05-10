ALTER TABLE "plan_versions" ADD COLUMN "content_type" text DEFAULT 'markdown' NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "content_type" text DEFAULT 'markdown' NOT NULL;