-- Phase 11. Single-purpose migration per OPS-05.
-- Adds ui_mode column to user_profiles for Easy/Advanced toggle persistence.
--
-- DEFENSIVE: CREATE TABLE IF NOT EXISTS guards against user_profiles already existing
-- (table is referenced by lib/auth/get-user-org.ts but was not in any prior Phase 09-10 migration).
--
-- OPS-05 NOTE: ui_mode is permanently NULLABLE by design.
-- NULL = "use role default" — this is a load-bearing semantic, NOT a backfill gap.
-- The OPS-05 step-4 NOT NULL constraint is intentionally skipped for this column.

CREATE TABLE IF NOT EXISTS user_profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS ui_mode TEXT;

COMMENT ON COLUMN user_profiles.ui_mode
  IS 'easy | advanced | NULL (NULL = role default applies). Set by per-page toggle. Permanently nullable — NULL is semantic.';

CREATE INDEX IF NOT EXISTS user_profiles_ui_mode_idx
  ON user_profiles (id, ui_mode);
