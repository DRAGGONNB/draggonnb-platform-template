-- ============================================================================
-- Migration: AI Usage Ledger
-- Phase: 09 (Foundations & Guard Rails)
-- REQ ID: USAGE-08 (immutable per-call ledger for AI cost tracking)
-- Created: 2026-04-25
--
-- One row per Anthropic API call (including retries and failures).
-- Inserted by BaseAgent.run() AFTER each API call completes (Phase 09).
-- Cost is computed at insert time using MODEL_PRICING from lib/ai/cost.ts.
-- Use get_month_to_date_ai_cost(p_org_id) RPC for circuit-breaker checks.
-- ============================================================================

-- ============================================================================
-- TABLE: ai_usage_ledger
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_usage_ledger (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_session_id  UUID         REFERENCES agent_sessions(id) ON DELETE SET NULL,
  agent_type        TEXT         NOT NULL,
  model             TEXT         NOT NULL,
  input_tokens      INTEGER      NOT NULL DEFAULT 0,
  output_tokens     INTEGER      NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER      NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER     NOT NULL DEFAULT 0,
  cost_zar_cents    INTEGER      NOT NULL CHECK (cost_zar_cents >= 0),
  request_id        TEXT,
  was_retry         BOOLEAN      NOT NULL DEFAULT false,
  error             TEXT,
  recorded_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_usage_ledger IS
  'One row per Anthropic API call (including retries and failures). '
  'Cost is computed at insert time using MODEL_PRICING in lib/ai/cost.ts. '
  'Use get_month_to_date_ai_cost(p_org_id) RPC for circuit-breaker checks. '
  'agent_session_id is SET NULL on session delete to preserve ledger audit trail.';

COMMENT ON COLUMN ai_usage_ledger.request_id IS
  'Anthropic response.id — used for deduplication on retry. '
  'NULL if the call failed before receiving a response.';

COMMENT ON COLUMN ai_usage_ledger.error IS
  'Error message if the Anthropic call failed. NULL on success.';

COMMENT ON COLUMN ai_usage_ledger.was_retry IS
  'True if this row is a retry attempt (same prompt, new Anthropic call). '
  'Counted separately for cost accuracy.';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup: org cost queries (most frequent)
CREATE INDEX IF NOT EXISTS idx_ai_usage_ledger_org_date
  ON ai_usage_ledger (organization_id, recorded_at DESC);

-- Daily cost-rollup cron: slice by recorded_at across all orgs
CREATE INDEX IF NOT EXISTS idx_ai_usage_ledger_recorded_at
  ON ai_usage_ledger (recorded_at);

-- Dedup lookup: find existing row for a given Anthropic request_id
CREATE INDEX IF NOT EXISTS idx_ai_usage_ledger_request_id
  ON ai_usage_ledger (request_id)
  WHERE request_id IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE ai_usage_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_ledger FORCE ROW LEVEL SECURITY;

-- Org members can read their own usage (cost transparency)
CREATE POLICY "ai_ledger_org_read" ON ai_usage_ledger
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

-- Service role has full access (insert by BaseAgent, backfill, cron)
CREATE POLICY "ai_ledger_service_role" ON ai_usage_ledger
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_indexes INTEGER;
BEGIN
  -- Verify table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'ai_usage_ledger'
  ) THEN
    RAISE NOTICE 'ai_usage_ledger table created successfully';
  ELSE
    RAISE EXCEPTION 'ai_usage_ledger table NOT found';
  END IF;

  -- Verify column count (14 columns expected)
  SELECT COUNT(*) INTO v_indexes
    FROM information_schema.columns
   WHERE table_name = 'ai_usage_ledger';
  RAISE NOTICE 'ai_usage_ledger has % columns', v_indexes;

  -- Verify indexes (pkey + 3 custom = 4 expected)
  SELECT COUNT(*) INTO v_indexes
    FROM pg_indexes WHERE tablename = 'ai_usage_ledger';
  RAISE NOTICE 'ai_usage_ledger has % indexes', v_indexes;

  IF v_indexes < 4 THEN
    RAISE EXCEPTION 'ai_usage_ledger expected >= 4 indexes, found %', v_indexes;
  END IF;

  -- Verify RLS policies
  IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'ai_usage_ledger') >= 2 THEN
    RAISE NOTICE 'ai_usage_ledger has % RLS policies', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'ai_usage_ledger');
  ELSE
    RAISE EXCEPTION 'ai_usage_ledger expected >= 2 RLS policies';
  END IF;

  RAISE NOTICE 'Migration 26_ai_usage_ledger completed successfully';
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
