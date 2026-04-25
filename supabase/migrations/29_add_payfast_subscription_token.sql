-- ============================================================================
-- Migration 29: Ensure payfast_subscription_token column exists
-- Phase: 09 (Foundations & Guard Rails) — ERR-030 fix
-- Created: 2026-04-25
--
-- Deviation auto-fix (Rule 3): Wave 1 research confirmed payfast_subscription_token
-- may not exist on live remote DB despite being in 00_initial_schema.sql.
-- Using ADD COLUMN IF NOT EXISTS for idempotency.
--
-- PHASE 09 FIX: pf_payment_id is per-transaction; payfast_subscription_token must
-- come from ITN.token (the subscription token PayFast returns on first payment).
-- NEVER overwrite payfast_subscription_token with pf_payment_id.
-- ============================================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS payfast_subscription_token TEXT;

COMMENT ON COLUMN organizations.payfast_subscription_token IS
  'PHASE 09 FIX (ERR-030): This MUST be set from ITN.token field on the first successful '
  'DRG-* subscription payment. NEVER overwrite with pf_payment_id (per-transaction ID). '
  'The subscription token is what PayFast API uses for amendments, cancellations, etc.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'organizations' AND column_name = 'payfast_subscription_token'
  ) THEN
    RAISE NOTICE 'payfast_subscription_token column confirmed on organizations';
  ELSE
    RAISE EXCEPTION 'payfast_subscription_token column NOT found on organizations';
  END IF;

  RAISE NOTICE 'Migration 29_add_payfast_subscription_token completed';
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
