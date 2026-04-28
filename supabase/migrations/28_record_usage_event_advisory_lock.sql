-- ============================================================================
-- Migration: Harden record_usage_event with Advisory Lock
-- Phase: 09 (Foundations & Guard Rails)
-- REQ ID: USAGE-05 (50-concurrent-request test proves no leakage)
-- Created: 2026-04-25
--
-- WHY THIS FIX IS REQUIRED (USAGE-05 / ERR-031):
-- The original record_usage_event (migration 12) has a SELECT-SUM-then-INSERT
-- race under PostgreSQL's default READ COMMITTED isolation:
--
--   Tx A: SELECT SUM(quantity) WHERE org=X AND metric=Y AND month=now → 49
--   Tx B: SELECT SUM(quantity) WHERE org=X AND metric=Y AND month=now → 49
--   Tx A: (49+1) <= 50 → INSERT  [succeeds]
--   Tx B: (49+1) <= 50 → INSERT  [also succeeds — cap bypassed!]
--
-- At high concurrency (load tests, burst API traffic) both transactions see
-- the same pre-commit count and both insert past the limit. Confirmed by
-- research (ERR-031) and reproducible with 50 concurrent Vitest calls.
--
-- FIX: pg_advisory_xact_lock() per (org_id, metric) pair.
-- - XACT variant: lock is released automatically when the transaction ends —
--   no manual UNLOCK needed, no lock leaks on error/abort.
-- - hashtext() produces a 32-bit integer from a text key. We combine org_id
--   and metric into a single text string and hash it to one INT4 that serves
--   as the advisory lock key. Collisions are theoretically possible but
--   astronomically unlikely (2^32 space) and only cause false serialisation
--   between unrelated (org, metric) pairs — never incorrect results.
-- - All CONCURRENT calls to record_usage_event for the SAME (org, metric)
--   are now serialised: the second caller blocks at pg_advisory_xact_lock()
--   until the first commits/rolls back, then re-reads the SUM with an
--   accurate post-commit count.
--
-- PARAM NAMES PRESERVED: p_org_id, p_metric, p_quantity, p_metadata
-- RETURN TYPE PRESERVED: JSONB {allowed, current, limit, remaining}
-- All existing callers (lib/usage/meter.ts, guardUsage) continue to work.
-- ============================================================================

CREATE OR REPLACE FUNCTION record_usage_event(
  p_org_id    UUID,
  p_metric    TEXT,
  p_quantity  INTEGER DEFAULT 1,
  p_metadata  JSONB   DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit    INTEGER;
  v_current  INTEGER;
  v_plan_id  TEXT;
  v_result   JSONB;
BEGIN
  -- ----------------------------------------------------------------
  -- SERIALISATION GATE (USAGE-05 / ERR-031 advisory-lock fix)
  -- Acquire a transaction-scoped advisory lock keyed on (org_id, metric).
  -- This serialises all concurrent calls for the same pair so the
  -- SELECT-SUM below always reads the committed state of prior transactions.
  -- Lock is released automatically at transaction end (COMMIT/ROLLBACK).
  -- ----------------------------------------------------------------
  PERFORM pg_advisory_xact_lock(hashtext(p_org_id::text || ':' || p_metric));

  -- Get the org's plan_id
  SELECT o.plan_id INTO v_plan_id
    FROM organizations o
   WHERE o.id = p_org_id;

  -- Look up the limit for this metric from billing_plans
  SELECT (bp.limits ->> p_metric)::INTEGER INTO v_limit
    FROM billing_plans bp
   WHERE bp.id = COALESCE(v_plan_id, 'core');

  -- NULL limit means metric not defined in plan; default to 0
  IF v_limit IS NULL THEN
    v_limit := 0;
  END IF;

  -- Get current month usage for this org + metric
  -- (Advisory lock guarantees this SUM is stable against concurrent transactions)
  SELECT COALESCE(SUM(quantity), 0) INTO v_current
    FROM usage_events
   WHERE organization_id = p_org_id
     AND metric = p_metric
     AND recorded_at >= date_trunc('month', now())
     AND recorded_at <  date_trunc('month', now()) + interval '1 month';

  -- Check if allowed: -1 = unlimited, otherwise must be under limit
  IF v_limit = -1 OR (v_current + p_quantity) <= v_limit THEN
    -- Record the event
    INSERT INTO usage_events (organization_id, metric, quantity, metadata)
    VALUES (p_org_id, p_metric, p_quantity, p_metadata);

    v_result := jsonb_build_object(
      'allowed',    true,
      'current',    v_current + p_quantity,
      'limit',      v_limit,
      'remaining',  CASE WHEN v_limit = -1 THEN -1
                         ELSE v_limit - (v_current + p_quantity)
                    END
    );
  ELSE
    v_result := jsonb_build_object(
      'allowed',    false,
      'current',    v_current,
      'limit',      v_limit,
      'remaining',  GREATEST(0, v_limit - v_current)
    );
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION record_usage_event(UUID, TEXT, INTEGER, JSONB) IS
  'Atomically check org plan limit and insert usage event if allowed. '
  'Phase 09 (migration 28): hardened with pg_advisory_xact_lock() per '
  '(org_id, metric) to eliminate SELECT-SUM-then-INSERT race under READ COMMITTED. '
  'Returns JSONB {allowed, current, limit, remaining}. '
  'Callers: lib/usage/meter.ts (recordUsage), lib/usage/guard.ts (guardUsage).';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
     WHERE proname = 'record_usage_event'
       AND prosrc LIKE '%pg_advisory_xact_lock%'
  ) THEN
    RAISE NOTICE 'record_usage_event: advisory lock present — ERR-031 race fixed';
  ELSE
    RAISE EXCEPTION 'record_usage_event: advisory lock NOT found in function body';
  END IF;

  RAISE NOTICE 'Migration 28_record_usage_event_advisory_lock completed successfully';
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
