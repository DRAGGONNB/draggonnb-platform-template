-- ============================================================================
-- Migration: Subscription Composition History Table
-- Phase: 09 (Foundations & Guard Rails)
-- REQ ID: BILL-04 (composition history — current + historical per org)
-- Created: 2026-04-25
--
-- Purpose: Track each org's subscription composition over time.
--   effective_to IS NULL = current composition
--   Time-travel: WHERE effective_from <= $ts AND (effective_to > $ts OR effective_to IS NULL)
--
-- Partial unique index prevents more than one open-ended row per org.
-- Backfill for the 8 existing orgs runs in Plan 09-02 after compose() lands.
-- ============================================================================

-- ============================================================================
-- TABLE: subscription_composition
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_composition (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  base_plan_id            TEXT         REFERENCES billing_plans(id),
  addon_ids               TEXT[]       NOT NULL DEFAULT '{}',
  monthly_total_zar_cents INTEGER      NOT NULL CHECK (monthly_total_zar_cents >= 0),
  setup_fee_zar_cents     INTEGER      NOT NULL DEFAULT 0 CHECK (setup_fee_zar_cents >= 0),
  effective_from          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  effective_to            TIMESTAMPTZ,
  reason                  TEXT,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (organization_id, effective_from)
);

COMMENT ON TABLE subscription_composition IS
  'Current and historical subscription composition per org. '
  'effective_to IS NULL = current. '
  'Time-travel queries: WHERE effective_from <= $ts AND (effective_to > $ts OR effective_to IS NULL). '
  'addon_ids array references billing_addons_catalog.id — validated at app layer, not FK.';

COMMENT ON COLUMN subscription_composition.reason IS
  'Audit label for why this composition was created. '
  'Expected values: subscribe, addon_added, addon_removed, plan_change.';

COMMENT ON COLUMN subscription_composition.addon_ids IS
  'Array of billing_addons_catalog.id values. Validated at app layer (lib/billing/composition.ts). '
  'Not a FK array — Postgres does not support array FK constraints.';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Partial unique index: only one current (effective_to IS NULL) row per org
CREATE UNIQUE INDEX IF NOT EXISTS subscription_composition_one_current_per_org
  ON subscription_composition (organization_id)
  WHERE effective_to IS NULL;

-- History queries: list all compositions for an org in reverse order
CREATE INDEX IF NOT EXISTS idx_subscription_composition_org_history
  ON subscription_composition (organization_id, effective_from DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE subscription_composition ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_composition FORCE ROW LEVEL SECURITY;

-- Org members can read their own composition history
CREATE POLICY "composition_org_read" ON subscription_composition
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

-- Service role has full access (billing mutations, backfill scripts)
CREATE POLICY "composition_service_role" ON subscription_composition
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Verify table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'subscription_composition'
  ) THEN
    RAISE NOTICE 'subscription_composition table created successfully';
  ELSE
    RAISE EXCEPTION 'subscription_composition table NOT found';
  END IF;

  -- Verify partial unique index exists
  IF EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE tablename = 'subscription_composition'
       AND indexname = 'subscription_composition_one_current_per_org'
  ) THEN
    RAISE NOTICE 'subscription_composition_one_current_per_org partial index exists';
  ELSE
    RAISE EXCEPTION 'Partial unique index subscription_composition_one_current_per_org NOT found';
  END IF;

  -- Verify RLS policies
  IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'subscription_composition') >= 2 THEN
    RAISE NOTICE 'subscription_composition has % RLS policies', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'subscription_composition');
  ELSE
    RAISE EXCEPTION 'subscription_composition expected >= 2 RLS policies';
  END IF;

  RAISE NOTICE 'Migration 23_subscription_composition completed successfully';
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
