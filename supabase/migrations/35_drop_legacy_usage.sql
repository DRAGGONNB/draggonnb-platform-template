-- ============================================================================
-- Migration: DROP Legacy Usage Surface (client_usage_metrics + RPCs)
-- Phase: 10 (Brand Voice + Site Redesign + 3-Day Onboarding)
-- REQ ID: USAGE-13 (remove legacy checkUsage/incrementUsage surface)
-- Created: 2026-04-26
--
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-- DO NOT APPLY UNTIL plan 10-02 has migrated all 5 callsites off legacy usage:
--   1. lib/billing/subscriptions.ts handlePaymentComplete() DELETED (0 callers)
--   2. app/api/autopilot/chat/route.ts uses guardUsage()
--   3. app/api/autopilot/generate/route.ts uses guardUsage() (also fixes ERR-035)
--   4. app/api/content/generate/route.ts uses guardUsage() + getUserOrg() (ERR-034)
--   5. app/api/content/generate/social/route.ts uses guardUsage()
--   6. app/api/content/generate/email/route.ts uses guardUsage()
--   7. app/api/email/send/route.ts + app/api/email/campaigns/[id]/send/route.ts
--      add guardUsage('email_sends')
--
-- Verification before applying:
--   grep -r "checkUsage\|incrementUsage\|client_usage_metrics" lib/ app/
--   -- Expect: 0 hits BEFORE applying this migration.
--
-- Final apply:
--   node scripts/migrations/phase-10/apply-migration.mjs \
--     supabase/migrations/35_drop_legacy_usage.sql
--   (or Supabase MCP apply_migration in plan 10-02 task 5)
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
--
-- NOTE: increment_usage_metric has TWO overloads in live DB:
--   1. (p_organization_id uuid, p_column_name text, p_amount integer)
--   2. (p_client_id uuid, p_metric_name character varying, p_increment integer)
--   Both are dropped.
-- ============================================================================

-- ============================================================================
-- PRE-FLIGHT: Abort if code is still writing to legacy surface
-- ============================================================================

DO $$
DECLARE
  v_row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_row_count
    FROM client_usage_metrics
   WHERE updated_at > now() - interval '24 hours';

  IF v_row_count > 0 THEN
    RAISE EXCEPTION
      'client_usage_metrics has % rows updated in last 24h — code is still writing here. '
      'ABORT migration 35. Ensure all 7 callsites have been migrated off checkUsage/incrementUsage '
      'before applying this migration.',
      v_row_count;
  END IF;

  RAISE NOTICE 'Pre-flight OK: 0 rows updated in client_usage_metrics in last 24h';
END;
$$;

-- ============================================================================
-- DROP: increment_usage_metric RPC (both overloads)
-- ============================================================================

DROP FUNCTION IF EXISTS public.increment_usage_metric(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.increment_usage_metric(UUID, VARCHAR, INTEGER);

-- ============================================================================
-- DROP: client_usage_metrics table
-- ============================================================================

DROP TABLE IF EXISTS public.client_usage_metrics;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Verify table gone
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'client_usage_metrics'
  ) THEN
    RAISE EXCEPTION 'client_usage_metrics table still exists after DROP — migration 35 failed';
  END IF;
  RAISE NOTICE 'client_usage_metrics table successfully dropped';

  -- Verify all RPC overloads gone
  IF EXISTS (
    SELECT 1 FROM pg_proc
     WHERE proname = 'increment_usage_metric'
  ) THEN
    RAISE EXCEPTION 'increment_usage_metric function still exists after DROP — migration 35 failed';
  END IF;
  RAISE NOTICE 'increment_usage_metric function (all overloads) successfully dropped';

  RAISE NOTICE 'Migration 35_drop_legacy_usage completed successfully (USAGE-13 closed)';
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
