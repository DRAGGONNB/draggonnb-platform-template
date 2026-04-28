-- ============================================================================
-- Migration: Daily Cost Rollup + Month-to-Date AI Cost RPC
-- Phase: 09 (Foundations & Guard Rails)
-- REQ IDs: USAGE-10 (daily rollup table), USAGE-06/07 (helper RPC for circuit breaker)
-- Created: 2026-04-25
--
-- daily_cost_rollup: Pre-aggregated per-org daily cost rows.
--   Populated nightly by the Phase 09-04 cron (N8N workflow).
--   UNIQUE (organization_id, rollup_date) — INSERT ... ON CONFLICT DO UPDATE.
--
-- get_month_to_date_ai_cost(p_org_id UUID) RETURNS INTEGER:
--   Queries ai_usage_ledger directly for real-time accuracy.
--   STABLE + SECURITY DEFINER so it bypasses caller RLS on ai_usage_ledger.
--   Called by lib/ai/cost-ceiling.ts BEFORE every BaseAgent Anthropic call.
-- ============================================================================

-- ============================================================================
-- TABLE: daily_cost_rollup
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_cost_rollup (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rollup_date             DATE         NOT NULL,
  total_cost_zar_cents    INTEGER      NOT NULL DEFAULT 0,
  total_input_tokens      INTEGER      NOT NULL DEFAULT 0,
  total_output_tokens     INTEGER      NOT NULL DEFAULT 0,
  total_cache_read_tokens INTEGER      NOT NULL DEFAULT 0,
  total_cache_write_tokens INTEGER     NOT NULL DEFAULT 0,
  call_count              INTEGER      NOT NULL DEFAULT 0,
  failed_call_count       INTEGER      NOT NULL DEFAULT 0,
  rolled_up_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (organization_id, rollup_date)
);

COMMENT ON TABLE daily_cost_rollup IS
  'Pre-aggregated daily AI cost rows per org. '
  'Populated nightly by Phase 09-04 cron (N8N workflow + RPC). '
  'Use INSERT ... ON CONFLICT (organization_id, rollup_date) DO UPDATE for idempotent upserts. '
  'For real-time circuit-breaker checks use get_month_to_date_ai_cost() instead.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_daily_cost_rollup_org_date
  ON daily_cost_rollup (organization_id, rollup_date DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE daily_cost_rollup ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_cost_rollup FORCE ROW LEVEL SECURITY;

-- Org members can read their own daily cost summaries (cost dashboard)
CREATE POLICY "cost_rollup_org_read" ON daily_cost_rollup
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

-- Service role has full access (cron upserts)
CREATE POLICY "cost_rollup_service_role" ON daily_cost_rollup
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- RPC: get_month_to_date_ai_cost
-- ============================================================================
-- Returns month-to-date AI cost in ZAR cents for the given org.
-- Queries ai_usage_ledger directly for real-time accuracy (not the rollup).
-- STABLE: result is consistent within a transaction (Postgres can cache).
-- SECURITY DEFINER: bypasses caller's RLS on ai_usage_ledger so the function
--   always has read access regardless of the calling context.
-- SET search_path = public: security best practice for SECURITY DEFINER functions.

CREATE OR REPLACE FUNCTION get_month_to_date_ai_cost(p_org_id UUID)
  RETURNS INTEGER
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT COALESCE(SUM(cost_zar_cents), 0)::INTEGER
    FROM ai_usage_ledger
   WHERE organization_id = p_org_id
     AND recorded_at >= date_trunc('month', now())
     AND recorded_at <  date_trunc('month', now()) + interval '1 month';
$$;

COMMENT ON FUNCTION get_month_to_date_ai_cost(UUID) IS
  'Returns month-to-date AI cost in ZAR cents for the given org. '
  'Called by lib/ai/cost-ceiling.ts BEFORE every BaseAgent Anthropic call. '
  'STABLE + SECURITY DEFINER — RLS bypassed so caller''s own RLS context '
  'does not need ai_usage_ledger visibility. Returns 0 if no rows this month.';

GRANT EXECUTE ON FUNCTION get_month_to_date_ai_cost(UUID) TO authenticated, service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_cost INTEGER;
BEGIN
  -- Verify daily_cost_rollup table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'daily_cost_rollup'
  ) THEN
    RAISE NOTICE 'daily_cost_rollup table created successfully';
  ELSE
    RAISE EXCEPTION 'daily_cost_rollup table NOT found';
  END IF;

  -- Verify UNIQUE constraint on (organization_id, rollup_date)
  IF EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE tablename = 'daily_cost_rollup'
       AND indexdef LIKE '%organization_id%rollup_date%'
  ) THEN
    RAISE NOTICE 'daily_cost_rollup UNIQUE (org, date) index confirmed';
  ELSE
    RAISE EXCEPTION 'daily_cost_rollup UNIQUE index NOT found';
  END IF;

  -- Verify get_month_to_date_ai_cost RPC exists and returns 0 for null org
  SELECT get_month_to_date_ai_cost('00000000-0000-0000-0000-000000000000'::uuid) INTO v_cost;
  RAISE NOTICE 'get_month_to_date_ai_cost(nil_uuid) = % (expect 0)', v_cost;

  IF v_cost != 0 THEN
    RAISE EXCEPTION 'get_month_to_date_ai_cost expected 0, got %', v_cost;
  END IF;

  -- Verify RLS policies
  IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'daily_cost_rollup') >= 2 THEN
    RAISE NOTICE 'daily_cost_rollup has % RLS policies', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'daily_cost_rollup');
  ELSE
    RAISE EXCEPTION 'daily_cost_rollup expected >= 2 RLS policies';
  END IF;

  RAISE NOTICE 'Migration 27_daily_cost_rollup completed successfully';
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
