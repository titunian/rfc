ALTER TABLE plans ADD COLUMN IF NOT EXISTS tags text DEFAULT '[]';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS status_changed_at timestamp;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS status_changed_by text;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || content)) STORED;
CREATE INDEX IF NOT EXISTS idx_plans_search ON plans USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_plans_tags ON plans USING gin((tags::jsonb));
