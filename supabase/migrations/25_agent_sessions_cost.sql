-- ============================================================================
-- Migration: Agent Sessions — Cost + Token Tracking Columns
-- Phase: 09 (Foundations & Guard Rails)
-- REQ ID: USAGE-09 (per-call cost tracking via agent sessions)
-- Created: 2026-04-25
--
-- OPS-05 DISCIPLINE: All 6 new columns are NULLABLE. Historical rows
-- (pre-Phase-09) will not be backfilled — they represent pre-cost-tracking runs.
--
-- NOTE: If agent_sessions does not exist yet (not all environments have run
-- migration 05_leads_and_agents.sql), this migration creates it in full.
-- The ADD COLUMN IF NOT EXISTS guards ensure idempotency regardless.
-- ============================================================================

-- ============================================================================
-- TABLE: agent_sessions (CREATE if not exists, idempotent)
-- ============================================================================
-- Original schema from 05_leads_and_agents.sql reproduced here so environments
-- that skipped older migrations are still consistent.

CREATE TABLE IF NOT EXISTS agent_sessions (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         REFERENCES organizations(id) ON DELETE CASCADE,
  agent_type      TEXT         NOT NULL,
  lead_id         UUID         REFERENCES leads(id),
  messages        JSONB        NOT NULL DEFAULT '[]'::jsonb,
  tokens_used     INTEGER      NOT NULL DEFAULT 0,
  status          TEXT         NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'completed', 'failed')),
  result          JSONB,
  created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Original indexes (IF NOT EXISTS guards for idempotency)
CREATE INDEX IF NOT EXISTS idx_agent_sessions_organization_id ON agent_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent_type ON agent_sessions(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_lead_id ON agent_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);

-- ============================================================================
-- NEW COLUMNS: Cost + Token Tracking (Phase 09 additions — all NULLABLE)
-- ============================================================================

ALTER TABLE agent_sessions
  ADD COLUMN IF NOT EXISTS input_tokens       INTEGER,
  ADD COLUMN IF NOT EXISTS output_tokens      INTEGER,
  ADD COLUMN IF NOT EXISTS cache_read_tokens  INTEGER,
  ADD COLUMN IF NOT EXISTS cache_write_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS cost_zar_cents     INTEGER,
  ADD COLUMN IF NOT EXISTS model              TEXT;

COMMENT ON COLUMN agent_sessions.input_tokens IS
  'Cumulative input_tokens across all Anthropic calls in this session. '
  'Populated by BaseAgent.run() in Phase 09. Nullable for pre-Phase-09 rows.';

COMMENT ON COLUMN agent_sessions.output_tokens IS
  'Cumulative output_tokens across all Anthropic calls in this session. '
  'Populated by BaseAgent.run() in Phase 09. Nullable for pre-Phase-09 rows.';

COMMENT ON COLUMN agent_sessions.cache_read_tokens IS
  'Cumulative cache_read_input_tokens — counts tokens served from Anthropic prompt cache. '
  'Nullable for pre-Phase-09 rows.';

COMMENT ON COLUMN agent_sessions.cache_write_tokens IS
  'Cumulative cache_creation_input_tokens — tokens written to prompt cache. '
  'Nullable for pre-Phase-09 rows.';

COMMENT ON COLUMN agent_sessions.cost_zar_cents IS
  'Cumulative computed cost in ZAR cents, using MODEL_PRICING from lib/ai/cost.ts. '
  'Nullable for pre-Phase-09 rows.';

COMMENT ON COLUMN agent_sessions.model IS
  'Actual model returned by Anthropic (response.model). '
  'Truth-of-what-ran; can differ from the model that was requested. '
  'Nullable for pre-Phase-09 rows.';

-- tokens_used is kept as-is for backwards compatibility (running total column)
-- Do NOT rename or remove tokens_used.

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  missing TEXT[] := '{}';
  col TEXT;
BEGIN
  -- Check all 6 new columns exist and are nullable
  FOREACH col IN ARRAY ARRAY['input_tokens','output_tokens','cache_read_tokens','cache_write_tokens','cost_zar_cents','model']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_name = 'agent_sessions'
         AND column_name = col
         AND is_nullable = 'YES'
    ) THEN
      missing := array_append(missing, col);
    END IF;
  END LOOP;

  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'agent_sessions missing columns: %', missing;
  END IF;

  RAISE NOTICE 'agent_sessions: all 6 cost/token columns present and nullable';

  -- Verify tokens_used still exists (backward compat guard)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'agent_sessions' AND column_name = 'tokens_used'
  ) THEN
    RAISE EXCEPTION 'agent_sessions.tokens_used is missing — backward compatibility broken';
  END IF;
  RAISE NOTICE 'agent_sessions.tokens_used still present (backward compat OK)';

  RAISE NOTICE 'Migration 25_agent_sessions_cost completed successfully';
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
