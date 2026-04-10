-- Users table — upserted on every sign-in (web or CLI).
-- The single source of truth for "who has an orfc account".

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- Login events — append-only audit log of every sign-in.
-- method is "web" or "cli".

CREATE TABLE IF NOT EXISTS login_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  method TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Backfill existing users from api_keys (CLI logins) and plans (publishers).
INSERT INTO users (email, name, created_at)
SELECT DISTINCT ON (e) e, SPLIT_PART(e, '@', 1), NOW()
FROM (
  SELECT user_email AS e FROM api_keys
  UNION
  SELECT author_email AS e FROM plans WHERE author_email IS NOT NULL
) sub
ON CONFLICT (email) DO NOTHING;
