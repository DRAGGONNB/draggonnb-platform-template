-- ============================================================================
-- Migration: subscription_history Table
-- Phase: 10 (Brand Voice + Site Redesign + 3-Day Onboarding)
-- Closes: ERR-033 (latent: lib/billing/subscriptions.ts INSERTs into a
--         non-existent table — silent failure on every PayFast ITN)
-- Created: 2026-04-26
--
-- COLUMN SHAPE derived from actual INSERT calls in lib/billing/subscriptions.ts:
--   handlePaymentComplete() lines 288-299: organization_id, transaction_id,
--     amount, amount_fee, amount_net, status, payment_method, created_at
--   handlePaymentFailed() lines 359-367:  organization_id, transaction_id,
--     amount, status, payment_method, created_at
--
-- amount/amount_fee/amount_net are FLOAT (code calls parseFloat() on PayFast
-- string values). amount_fee and amount_net are NULLABLE (not sent by failed ITN).
--
-- Dependencies:
--   - 00_initial_schema.sql (organizations table)
--   - 10_shared_db_foundation.sql (get_user_org_id)
-- ============================================================================

-- ============================================================================
-- TABLE: subscription_history
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_history (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_id    TEXT,
  amount            DOUBLE PRECISION,
  amount_fee        DOUBLE PRECISION,
  amount_net        DOUBLE PRECISION,
  status            TEXT         NOT NULL CHECK (status IN ('completed','failed','pending','refunded','cancelled')),
  payment_method    TEXT,
  -- Extended fields for future ITN enrichment (not currently written by code)
  event_type        TEXT         CHECK (event_type IN (
                      'subscription_created','subscription_renewed','subscription_cancelled',
                      'payment_succeeded','payment_failed','plan_changed',
                      'addon_added','addon_removed'
                    )),
  payfast_payment_id TEXT,
  payfast_subscription_token TEXT,
  amount_zar_cents  INTEGER,
  metadata          JSONB        NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE subscription_history IS
  'Payment and subscription lifecycle event log. '
  'Written by lib/billing/subscriptions.ts handlePaymentComplete() and handlePaymentFailed(). '
  'ERR-033 fix: table was missing from live DB, causing silent INSERT failures on every PayFast ITN. '
  'amount/amount_fee/amount_net are FLOAT matching parseFloat() from PayFast string values. '
  'Extended fields (event_type, payfast_*) available for future ITN enrichment.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS subscription_history_org_created_idx
  ON subscription_history (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS subscription_history_event_type_idx
  ON subscription_history (event_type, created_at DESC)
  WHERE event_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscription_history_status_idx
  ON subscription_history (status, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history FORCE ROW LEVEL SECURITY;

-- Org members can read their own payment history
CREATE POLICY "subhist_org_read" ON subscription_history
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

-- Service role has full access (ITN webhook writes, admin reads)
CREATE POLICY "subhist_service_role" ON subscription_history
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Verify table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'subscription_history'
  ) THEN
    RAISE EXCEPTION 'subscription_history table NOT found';
  END IF;
  RAISE NOTICE 'subscription_history table created';

  -- Verify RLS forced
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
     WHERE relname = 'subscription_history'
       AND relrowsecurity = true
       AND relforcerowsecurity = true
  ) THEN
    RAISE EXCEPTION 'subscription_history: RLS not enabled or not forced';
  END IF;
  RAISE NOTICE 'subscription_history: RLS enabled and forced';

  -- Verify at least 2 policies
  IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'subscription_history') < 2 THEN
    RAISE EXCEPTION 'subscription_history expected >= 2 RLS policies, found %',
      (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'subscription_history');
  END IF;
  RAISE NOTICE 'subscription_history: % RLS policies confirmed',
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'subscription_history');

  RAISE NOTICE 'Migration 34_subscription_history completed successfully (ERR-033 closed)';
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
