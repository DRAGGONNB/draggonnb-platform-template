-- ============================================================================
-- Migration: Brand Voice Columns on client_profiles
-- Phase: 10 (Brand Voice + Site Redesign + 3-Day Onboarding)
-- REQ IDs: VOICE-02 (brand voice schema surface)
-- Created: 2026-04-26
--
-- OPS-05 DISCIPLINE: brand_voice_prompt and brand_voice_updated_at are NULLABLE.
-- TEXT[] columns use NOT NULL DEFAULT '{}' — Postgres applies default to existing
-- rows when adding NOT NULL with a DEFAULT in a single ALTER (safe, no backfill).
--
-- NOTE: client_profiles was defined in 09_autopilot_system.sql but never applied
-- to the live DB (same pattern as agent_sessions + migration 25). This migration
-- includes CREATE TABLE IF NOT EXISTS for idempotency, then ALTERs to add the 4
-- brand voice columns. The SELECT USING clause references organization_users (not
-- a legacy 'users' table). update_updated_at_column() already exists in live DB.
--
-- Dependencies:
--   - 00_initial_schema.sql (organizations table)
--   - 10_shared_db_foundation.sql (get_user_org_id)
--   - update_updated_at_column() trigger function (from 10_shared_db_foundation.sql)
-- ============================================================================

-- ============================================================================
-- TABLE: client_profiles (CREATE IF NOT EXISTS — may not be in live DB)
-- ============================================================================
-- Original schema from 09_autopilot_system.sql reproduced here so environments
-- that skipped older migrations are still consistent.

CREATE TABLE IF NOT EXISTS client_profiles (
  id                         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id            UUID         NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  business_name              TEXT         NOT NULL,
  industry                   TEXT         NOT NULL,
  sub_industry               TEXT,
  business_description       TEXT,
  target_market              TEXT         NOT NULL,
  company_size               TEXT,
  location                   TEXT,
  website                    TEXT,
  -- Brand voice (original fields)
  tone                       TEXT         NOT NULL DEFAULT 'professional',
  brand_values               TEXT[]       DEFAULT '{}',
  brand_do                   TEXT[]       DEFAULT '{}',
  brand_dont                 TEXT[]       DEFAULT '{}',
  tagline                    TEXT,
  -- Content strategy
  seo_keywords               TEXT[]       DEFAULT '{}',
  content_pillars            TEXT[]       DEFAULT '{}',
  competitor_names           TEXT[]       DEFAULT '{}',
  unique_selling_points      TEXT[]       DEFAULT '{}',
  -- Scheduling preferences
  preferred_platforms        TEXT[]       DEFAULT '{linkedin,facebook}',
  posting_frequency          JSONB        DEFAULT '{"linkedin": 3, "facebook": 2, "instagram": 2, "twitter": 1}',
  preferred_post_times       JSONB        DEFAULT '{"morning": "08:00", "afternoon": "12:00", "evening": "17:00"}',
  timezone                   TEXT         DEFAULT 'Africa/Johannesburg',
  -- Email campaign preferences
  email_campaigns_per_week   INTEGER      DEFAULT 1,
  preferred_email_goals      TEXT[]       DEFAULT '{newsletter,promotion}',
  email_send_day             TEXT         DEFAULT 'tuesday',
  email_send_time            TEXT         DEFAULT '09:00',
  -- Autopilot state
  autopilot_enabled          BOOLEAN      DEFAULT false,
  auto_generate_day          TEXT         DEFAULT 'monday',
  last_calendar_generated_at TIMESTAMP,
  last_calendar_week         TEXT,
  created_at                 TIMESTAMP    DEFAULT NOW(),
  updated_at                 TIMESTAMP    DEFAULT NOW()
);

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_client_profiles_org
  ON client_profiles (organization_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_autopilot
  ON client_profiles (autopilot_enabled)
  WHERE autopilot_enabled = true;

-- RLS (idempotent — use DROP POLICY IF EXISTS to guard against re-run)
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON client_profiles;
CREATE POLICY "client_profiles_org_read" ON client_profiles
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

DROP POLICY IF EXISTS "Users can update own profile" ON client_profiles;
CREATE POLICY "client_profiles_org_update" ON client_profiles
  FOR UPDATE USING (organization_id = (SELECT public.get_user_org_id()));

DROP POLICY IF EXISTS "Users can insert own profile" ON client_profiles;
CREATE POLICY "client_profiles_org_insert" ON client_profiles
  FOR INSERT WITH CHECK (organization_id = (SELECT public.get_user_org_id()));

DROP POLICY IF EXISTS "Service role full access to client_profiles" ON client_profiles;
CREATE POLICY "client_profiles_service_role" ON client_profiles
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Trigger (CREATE TRIGGER fails if already exists — guard with DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'update_client_profiles_updated_at'
       AND tgrelid = 'client_profiles'::regclass
  ) THEN
    CREATE TRIGGER update_client_profiles_updated_at
      BEFORE UPDATE ON client_profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

-- ============================================================================
-- COLUMNS: client_profiles brand voice extensions (VOICE-02)
-- ============================================================================

ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS brand_voice_prompt TEXT,
  ADD COLUMN IF NOT EXISTS example_phrases TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS forbidden_topics TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS brand_voice_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN client_profiles.brand_voice_prompt IS
  'Assembled brand voice doc (after PII scrub + cache padding) injected as cached system block in BaseAgent. NULL = wizard not yet run. Updated by app/api/brand-voice/save (plan 10-03).';

COMMENT ON COLUMN client_profiles.example_phrases IS
  'Verbatim phrases the brand uses; bullet-listed in the assembled prompt under PHRASES THAT SOUND LIKE US. Empty array = not yet configured.';

COMMENT ON COLUMN client_profiles.forbidden_topics IS
  'Topics/words the brand never uses; bullet-listed in the assembled prompt under NEVER USE OR MENTION. Empty array = not yet configured.';

COMMENT ON COLUMN client_profiles.brand_voice_updated_at IS
  'Set by /api/brand-voice/save. Used to invalidate downstream caches and to display last updated timestamp in settings UI. NULL = wizard not yet run.';

-- ============================================================================
-- INDEX: Support admin "recently updated voices" query
-- ============================================================================

CREATE INDEX IF NOT EXISTS client_profiles_brand_voice_updated_at_idx
  ON client_profiles (brand_voice_updated_at DESC)
  WHERE brand_voice_updated_at IS NOT NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_columns TEXT[] := ARRAY['brand_voice_prompt','example_phrases','forbidden_topics','brand_voice_updated_at'];
  col TEXT;
BEGIN
  -- Verify table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'client_profiles'
  ) THEN
    RAISE EXCEPTION 'client_profiles table NOT found after migration 31';
  END IF;
  RAISE NOTICE 'client_profiles table confirmed present';

  -- Verify brand voice columns
  FOREACH col IN ARRAY v_columns
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'client_profiles' AND column_name = col
    ) THEN
      RAISE EXCEPTION 'client_profiles.% column NOT found — migration 31 failed', col;
    END IF;
    RAISE NOTICE 'client_profiles.% confirmed present', col;
  END LOOP;

  -- Verify nullable discipline: brand_voice_prompt + brand_voice_updated_at = nullable
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'client_profiles'
       AND column_name = 'brand_voice_prompt'
       AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'brand_voice_prompt should be NULLABLE (OPS-05 discipline)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'client_profiles'
       AND column_name = 'brand_voice_updated_at'
       AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'brand_voice_updated_at should be NULLABLE (OPS-05 discipline)';
  END IF;

  -- Verify RLS forced
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
     WHERE relname = 'client_profiles'
       AND relrowsecurity = true
       AND relforcerowsecurity = true
  ) THEN
    RAISE EXCEPTION 'client_profiles: RLS not enabled or not forced';
  END IF;

  -- Verify >= 4 policies
  IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'client_profiles') < 4 THEN
    RAISE EXCEPTION 'client_profiles expected >= 4 RLS policies, found %',
      (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'client_profiles');
  END IF;

  RAISE NOTICE 'Migration 31_brand_voice_columns completed successfully';
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
