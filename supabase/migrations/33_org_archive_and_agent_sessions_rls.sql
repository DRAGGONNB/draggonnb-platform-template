-- ============================================================================
-- Migration: Org Archive + agent_sessions RLS + provisioning_jobs paused status
-- Phase: 10 (Brand Voice + Site Redesign + 3-Day Onboarding)
-- Created: 2026-04-26
--
-- Addresses three STATE.md pending todos + one pitfall in a single migration:
--   (A) "Phase 10 must define archived_at semantics first" — organizations.archived_at
--   (B) "Add RLS to agent_sessions" — ENABLE + FORCE + 4 policies (POPI gate for VOICE-03)
--   (C) "provisioning_jobs.status CHECK doesn't include 'paused'" — ONBOARD-07 gate
--
-- All three changes are schema-only (no data migration) and low risk.
-- Each section has its own DO $$ verification block.
--
-- Dependencies:
--   - 00_initial_schema.sql (organizations, provisioning_jobs, agent_sessions tables)
--   - 10_shared_db_foundation.sql (get_user_org_id)
--   - 25_agent_sessions_cost.sql (agent_sessions cost/token columns)
-- ============================================================================

-- ============================================================================
-- SECTION A: organizations.archived_at (soft-archive semantics)
-- ============================================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN organizations.archived_at IS
  'Soft-archive timestamp. NULL = active org. '
  'Tenant resolution middleware filters WHERE archived_at IS NULL (added in plan 10-07). '
  'Set via admin UI; NEVER hard-delete orgs (lose audit trail).';

CREATE INDEX IF NOT EXISTS organizations_active_idx
  ON organizations (id)
  WHERE archived_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'organizations'
       AND column_name = 'archived_at'
       AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'organizations.archived_at column not found or not nullable';
  END IF;
  RAISE NOTICE 'Section A: organizations.archived_at confirmed (NULLABLE TIMESTAMPTZ)';
END;
$$;

-- ============================================================================
-- SECTION B: agent_sessions RLS (closes pending todo, POPI gate for VOICE-03)
-- ============================================================================

ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sessions FORCE ROW LEVEL SECURITY;

-- Org members can read their own agent sessions
DROP POLICY IF EXISTS "agent_sessions_org_read" ON agent_sessions;
CREATE POLICY "agent_sessions_org_read" ON agent_sessions
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

-- Org members can insert their own agent sessions
DROP POLICY IF EXISTS "agent_sessions_org_write" ON agent_sessions;
CREATE POLICY "agent_sessions_org_write" ON agent_sessions
  FOR INSERT WITH CHECK (organization_id = (SELECT public.get_user_org_id()));

-- Org members can update their own agent sessions
DROP POLICY IF EXISTS "agent_sessions_org_update" ON agent_sessions;
CREATE POLICY "agent_sessions_org_update" ON agent_sessions
  FOR UPDATE USING (organization_id = (SELECT public.get_user_org_id()));

-- Service role has full access (BaseAgent writes, cost ledger reads)
DROP POLICY IF EXISTS "agent_sessions_service_role" ON agent_sessions;
CREATE POLICY "agent_sessions_service_role" ON agent_sessions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DO $$
DECLARE
  v_rls_row RECORD;
  v_policy_count INTEGER;
BEGIN
  SELECT relrowsecurity, relforcerowsecurity
    INTO v_rls_row
    FROM pg_class
   WHERE relname = 'agent_sessions';

  IF NOT v_rls_row.relrowsecurity OR NOT v_rls_row.relforcerowsecurity THEN
    RAISE EXCEPTION 'agent_sessions: RLS not enabled or not forced';
  END IF;
  RAISE NOTICE 'Section B: agent_sessions RLS enabled and forced';

  SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
   WHERE tablename = 'agent_sessions';

  IF v_policy_count < 4 THEN
    RAISE EXCEPTION 'agent_sessions expected >= 4 policies, found %', v_policy_count;
  END IF;
  RAISE NOTICE 'Section B: agent_sessions has % RLS policies (POPI gate active)', v_policy_count;
END;
$$;

-- ============================================================================
-- SECTION C: provisioning_jobs.status gains 'paused' (gates ONBOARD-07)
-- ============================================================================

-- Drop the old CHECK constraint (status IN ('pending','running','completed','failed','rolled_back'))
-- and recreate with 'paused' added.
ALTER TABLE provisioning_jobs
  DROP CONSTRAINT IF EXISTS provisioning_jobs_status_check;

ALTER TABLE provisioning_jobs
  ADD CONSTRAINT provisioning_jobs_status_check
  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rolled_back', 'paused'));

COMMENT ON COLUMN provisioning_jobs.status IS
  'pending|running|completed|failed|rolled_back|paused. '
  'paused added in Phase 10 (ONBOARD-07): step 5-9 failure leaves org alive and pauses saga '
  'for operator resume rather than cascade-delete.';

DO $$
DECLARE
  v_constraint_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(c.oid)
    INTO v_constraint_def
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
   WHERE t.relname = 'provisioning_jobs'
     AND c.contype = 'c'
     AND c.conname = 'provisioning_jobs_status_check';

  IF v_constraint_def IS NULL THEN
    RAISE EXCEPTION 'provisioning_jobs_status_check constraint not found';
  END IF;

  IF v_constraint_def NOT LIKE '%paused%' THEN
    RAISE EXCEPTION 'provisioning_jobs_status_check does not include paused. Got: %', v_constraint_def;
  END IF;

  RAISE NOTICE 'Section C: provisioning_jobs.status CHECK includes paused (ONBOARD-07 gate active)';
  RAISE NOTICE 'Constraint: %', v_constraint_def;

  RAISE NOTICE 'Migration 33_org_archive_and_agent_sessions_rls completed successfully';
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
