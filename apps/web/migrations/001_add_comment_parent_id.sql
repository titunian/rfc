-- Add parent_id column to comments table for threaded replies.
-- This is a nullable UUID so existing comments are unaffected (they become top-level).
-- Run this against your Neon/Postgres database before deploying the new code.

ALTER TABLE comments
ADD COLUMN IF NOT EXISTS parent_id UUID DEFAULT NULL;

-- Optional: add a foreign key constraint (self-referencing).
-- Replies whose parent is deleted become orphaned (they stay as top-level).
-- If you prefer cascade-delete replies when a parent is deleted, change to ON DELETE CASCADE.
ALTER TABLE comments
ADD CONSTRAINT fk_comments_parent
FOREIGN KEY (parent_id)
REFERENCES comments(id)
ON DELETE SET NULL;
