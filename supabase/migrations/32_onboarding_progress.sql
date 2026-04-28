-- ============================================================================
-- Migration: onboarding_progress Table
-- Phase: 10 (Brand Voice + Site Redesign + 3-Day Onboarding)
-- REQ IDs: ONBOARD-05 (per-org onboarding state machine schema)
-- Created: 2026-04-26
--
-- One-row-per-org onboarding state machine.
-- Written by provisioning saga (Day 0), N8N workflows (Day 1-3 emails),
-- brand voice wizard, and kickoff-call booking webhook.
-- Read by onboarding dashboard for progress display.
-- UNIQUE(organization_id) enforces one-row-per-org.
--
-- NOTE: Trigger uses update_updated_at_column() which exists in live DB
-- (not set_updated_at which does not exist).
--
-- Dependencies:
--   - 00_initial_schema.sql (organizations table)
--   - 10_shared_db_foundation.sql (get_user_org_id, update_updated_at_column)
-- ============================================================================

-- ============================================================================
-- TABLE: onboarding_progress
-- ============================================================================

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id                          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             UUID         NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  timer_started_at            TIMESTAMPTZ,
  timer_start_day             DATE,
  day0_completed_at           TIMESTAMPTZ,
  day1_email_sent_at          TIMESTAMPTZ,
  day2_email_sent_at          TIMESTAMPTZ,
  day3_email_sent_at          TIMESTAMPTZ,
  brand_voice_completed_at    TIMESTAMPTZ,
  kickoff_call_scheduled_at   TIMESTAMPTZ,
  kickoff_call_url            TEXT,
  steps_completed             TEXT[]       NOT NULL DEFAULT '{}',
  drift_flags                 TEXT[]       NOT NULL DEFAULT '{}',
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE onboarding_progress IS
  'Per-org onboarding state machine. Written by provisioning saga (Day 0), '
  'N8N workflows (Day 1-3 emails), brand voice wizard, and kickoff-call booking webhook. '
  'Read by onboarding dashboard for progress display. '
  'UNIQUE(organization_id) enforces one-row-per-org.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS onboarding_progress_org_idx
  ON onboarding_progress (organization_id);

CREATE INDEX IF NOT EXISTS onboarding_progress_timer_idx
  ON onboarding_progress (timer_start_day)
  WHERE timer_start_day IS NOT NULL;

-- ============================================================================
-- TRIGGER: auto-update updated_at
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'onboarding_progress_set_updated_at'
       AND tgrelid = 'onboarding_progress'::regclass
  ) THEN
    CREATE TRIGGER onboarding_progress_set_updated_at
      BEFORE UPDATE ON onboarding_progress
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onboarding_org_read" ON onboarding_progress;
CREATE POLICY "onboarding_org_read" ON onboarding_progress
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

DROP POLICY IF EXISTS "onboarding_org_update" ON onboarding_progress;
CREATE POLICY "onboarding_org_update" ON onboarding_progress
  FOR UPDATE USING (organization_id = (SELECT public.get_user_org_id()));

DROP POLICY IF EXISTS "onboarding_service_role" ON onboarding_progress;
CREATE POLICY "onboarding_service_role" ON onboarding_progress
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_col_count INTEGER;
  v_policy_count INTEGER;
  v_trigger_exists BOOLEAN;
BEGIN
  -- Verify table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'onboarding_progress'
  ) THEN
    RAISE EXCEPTION 'onboarding_progress table NOT found';
  END IF;
  RAISE NOTICE 'onboarding_progress table confirmed present';

  -- Verify 15 columns
  SELECT COUNT(*) INTO v_col_count
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'onboarding_progress';

  IF v_col_count < 15 THEN
    RAISE EXCEPTION 'onboarding_progress expected >= 15 columns, found %', v_col_count;
  END IF;
  RAISE NOTICE 'onboarding_progress: % columns confirmed', v_col_count;

  -- Verify UNIQUE constraint on organization_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE tablename = 'onboarding_progress'
       AND indexdef ILIKE '%unique%'
       AND indexdef LIKE '%organization_id%'
  ) THEN
    RAISE EXCEPTION 'onboarding_progress: UNIQUE(organization_id) constraint not found';
  END IF;
  RAISE NOTICE 'onboarding_progress: UNIQUE(organization_id) confirmed';

  -- Verify 3 RLS policies
  SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
   WHERE tablename = 'onboarding_progress';

  IF v_policy_count < 3 THEN
    RAISE EXCEPTION 'onboarding_progress expected >= 3 RLS policies, found %', v_policy_count;
  END IF;
  RAISE NOTICE 'onboarding_progress: % RLS policies confirmed', v_policy_count;

  -- Verify trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'onboarding_progress_set_updated_at'
       AND tgrelid = 'onboarding_progress'::regclass
  ) INTO v_trigger_exists;

  IF NOT v_trigger_exists THEN
    RAISE EXCEPTION 'onboarding_progress: updated_at trigger not found';
  END IF;
  RAISE NOTICE 'onboarding_progress: updated_at trigger confirmed';

  -- Verify RLS forced
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
     WHERE relname = 'onboarding_progress'
       AND relrowsecurity = true
       AND relforcerowsecurity = true
  ) THEN
    RAISE EXCEPTION 'onboarding_progress: RLS not enabled or not forced';
  END IF;

  RAISE NOTICE 'Migration 32_onboarding_progress completed successfully';
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
