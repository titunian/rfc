ALTER TABLE "plans" ADD COLUMN "folder_path" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;
