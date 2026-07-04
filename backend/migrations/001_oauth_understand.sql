-- Migration 001: Google OAuth columns + one-response-per-user understand checks
-- For databases created from the original schema.sql. Fresh installs just run
-- schema.sql, which already includes these changes.

BEGIN;

-- OAuth users have no password
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- Google profile ids are ~21-digit numbers – must be TEXT, not INT
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;

-- Keep only the newest understanding-check per (class_id, user_id) …
DELETE FROM understand_checks a
USING  understand_checks b
WHERE  a.class_id = b.class_id
  AND  a.user_id  = b.user_id
  AND  (a.checked_at < b.checked_at
        OR (a.checked_at = b.checked_at AND a.id < b.id));

-- … then lock that in so re-clicks update instead of piling up
ALTER TABLE understand_checks
  ADD CONSTRAINT understand_checks_class_user_key UNIQUE (class_id, user_id);

COMMIT;
