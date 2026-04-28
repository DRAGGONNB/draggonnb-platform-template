-- ============================================================================
-- Migration: Billing Plan Snapshot + Pricing Changelog
-- Phase: 09 (Foundations & Guard Rails)
-- REQ IDs: BILL-05 (snapshot-at-subscribe), BILL-07 (changelog audit trail)
-- Created: 2026-04-25
--
-- OPS-05 DISCIPLINE: Every new column on an existing populated table is NULLABLE.
-- NOT NULL constraints come in Phase 10 after backfill scripts have run.
--
-- Dependencies:
--   - 00_initial_schema.sql (organizations table)
--   - 10_shared_db_foundation.sql (get_user_org_id)
--   - 11_billing_plans.sql (billing_plans, used in FK context)
-- ============================================================================

-- ============================================================================
-- COLUMN: organizations.billing_plan_snapshot (NULLABLE)
-- ============================================================================
-- Snapshot of the billing plan at subscribe-time. ITN webhook validates against
-- this, NOT against current PRICING_TIERS (which may drift). Populated by
-- lib/billing/composition.ts at subscribe-time. NOT NULL constraint added in
-- Phase 10 after all 8 existing orgs are backfilled.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS billing_plan_snapshot JSONB;

COMMENT ON COLUMN organizations.billing_plan_snapshot IS
  'Set at subscribe-time; ITN webhook validates against this, not current PRICING_TIERS. '
  'Populated by lib/billing/composition.ts. NOT NULL in Phase 10 after backfill.';

-- Correction comment on payfast_subscription_token (column already exists, added as
-- documentation guard so future devs do not confuse token with pf_payment_id).
-- NOTE: payfast_subscription_token column does not exist yet on organizations.
-- That column documentation/comment is deferred to the migration that adds it.
-- Ref: Phase 09 webhook fix — do NOT overwrite token with pf_payment_id.

-- ============================================================================
-- TABLE: pricing_changelog
-- ============================================================================
-- Immutable audit trail of pricing changes. Every time a plan/addon price
-- changes in production, a row is inserted here. Used for billing dispute
-- resolution and historical analytics.

CREATE TABLE IF NOT EXISTS pricing_changelog (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT         NOT NULL CHECK (entity_type IN ('plan', 'addon', 'tier')),
  entity_id   TEXT         NOT NULL,
  old_value   JSONB        NOT NULL,
  new_value   JSONB        NOT NULL,
  changed_by  UUID         REFERENCES auth.users(id),
  reason      TEXT,
  changed_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_changelog_entity
  ON pricing_changelog (entity_type, entity_id, changed_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY: pricing_changelog
-- ============================================================================

ALTER TABLE pricing_changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_changelog FORCE ROW LEVEL SECURITY;

-- Service role has full access (used by billing mutation code paths)
CREATE POLICY "changelog_service_role" ON pricing_changelog
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Admin users can read the changelog (audit visibility)
-- NOTE: user_role enum has {admin,manager,user,client} — no platform_admin value.
-- Using 'admin' as the highest role. Deviation from plan: role = 'admin'.
CREATE POLICY "changelog_platform_admin_read" ON pricing_changelog
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_users
       WHERE user_id = auth.uid()
         AND role = 'admin'
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Verify billing_plan_snapshot column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'organizations' AND column_name = 'billing_plan_snapshot'
  ) THEN
    RAISE NOTICE 'billing_plan_snapshot column added to organizations (nullable JSONB)';
  ELSE
    RAISE EXCEPTION 'billing_plan_snapshot column NOT found on organizations';
  END IF;

  -- Verify pricing_changelog table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'pricing_changelog'
  ) THEN
    RAISE NOTICE 'pricing_changelog table created successfully';
  ELSE
    RAISE EXCEPTION 'pricing_changelog table NOT found';
  END IF;

  -- Verify RLS policies on pricing_changelog
  IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'pricing_changelog') >= 2 THEN
    RAISE NOTICE 'pricing_changelog has % RLS policies', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'pricing_changelog');
  ELSE
    RAISE EXCEPTION 'pricing_changelog expected >= 2 RLS policies, found %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'pricing_changelog');
  END IF;

  RAISE NOTICE 'Migration 22_billing_composition completed successfully';
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
