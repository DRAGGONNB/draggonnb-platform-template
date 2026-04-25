-- ============================================================================
-- Migration: Billing Addons Catalog + Seed Data
-- Phase: 09 (Foundations & Guard Rails)
-- REQ IDs: BILL-02 (addon catalog), BILL-03 (compose API backing store)
-- Created: 2026-04-25
--
-- This table is the source of truth for all add-on modules, overage packs,
-- and one-off fees. Used by lib/billing/composition.ts to validate and price
-- subscriptions. PayFast line items reference payfast_item_code.
-- ============================================================================

-- ============================================================================
-- TABLE: billing_addons_catalog
-- ============================================================================

CREATE TABLE IF NOT EXISTS billing_addons_catalog (
  id                TEXT         PRIMARY KEY,
  display_name      TEXT         NOT NULL,
  description       TEXT,
  kind              TEXT         NOT NULL CHECK (kind IN ('module', 'overage_pack', 'setup_fee')),
  price_zar_cents   INTEGER      NOT NULL CHECK (price_zar_cents >= 0),
  billing_cycle     TEXT         NOT NULL CHECK (billing_cycle IN ('monthly', 'one_off')),
  quantity_unit     TEXT,
  quantity_value    INTEGER,
  min_tier          TEXT         REFERENCES billing_plans(id),
  is_active         BOOLEAN      NOT NULL DEFAULT true,
  sort_order        INTEGER      NOT NULL DEFAULT 0,
  payfast_item_code TEXT         UNIQUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================================
-- TRIGGER: auto-update updated_at
-- ============================================================================

-- Reuse existing update_updated_at_column() function from migration 00/11.
-- Creates a fresh trigger (IF NOT EXISTS pattern via DROP IF EXISTS + CREATE).
DROP TRIGGER IF EXISTS update_billing_addons_catalog_updated_at ON billing_addons_catalog;
CREATE TRIGGER update_billing_addons_catalog_updated_at
  BEFORE UPDATE ON billing_addons_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_billing_addons_catalog_kind_active
  ON billing_addons_catalog (kind, is_active, sort_order);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE billing_addons_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_addons_catalog FORCE ROW LEVEL SECURITY;

-- Any authenticated user can browse the catalog (pricing page, self-serve)
CREATE POLICY "addons_public_read" ON billing_addons_catalog
  FOR SELECT USING (auth.role() = 'authenticated');

-- Service role has full access (seed, admin mutations)
CREATE POLICY "addons_service_role" ON billing_addons_catalog
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- SEED DATA — 7 locked rows (idempotent: ON CONFLICT DO NOTHING)
-- ============================================================================

INSERT INTO billing_addons_catalog
  (id, display_name, description, kind, price_zar_cents, billing_cycle, quantity_unit, quantity_value, payfast_item_code, sort_order)
VALUES
  (
    'finance_ai',
    'Finance-AI Module',
    'AI-powered financial reporting, receipt processing, and expense categorisation',
    'module',
    39900,
    'monthly',
    NULL,
    NULL,
    'ADDON-FINANCE-AI',
    10
  ),
  (
    'events',
    'Events Module',
    'Event bookings, venue management, ticketing, and catering packages',
    'module',
    29900,
    'monthly',
    NULL,
    NULL,
    'ADDON-EVENTS',
    20
  ),
  (
    'white_label',
    'White-label Branding',
    'Custom domain, remove DraggonnB branding, apply your own logo and colour scheme',
    'module',
    49900,
    'monthly',
    NULL,
    NULL,
    'ADDON-WHITELABEL',
    30
  ),
  (
    'setup_fee',
    'Setup & Onboarding',
    'One-off professional setup, data migration, and onboarding session',
    'setup_fee',
    149900,
    'one_off',
    NULL,
    NULL,
    'ONEOFF-SETUP',
    1
  ),
  (
    'topup_posts_100',
    '100 Extra Social Posts',
    'Top up your monthly social post quota by 100 posts',
    'overage_pack',
    4900,
    'one_off',
    'posts',
    100,
    'TOPUP-POSTS-100',
    100
  ),
  (
    'topup_ai_50',
    '50 Extra AI Generations',
    'Top up your monthly AI content generation quota by 50 generations',
    'overage_pack',
    9900,
    'one_off',
    'ai_generations',
    50,
    'TOPUP-AI-50',
    110
  ),
  (
    'topup_emails_1000',
    '1,000 Extra Email Sends',
    'Top up your monthly email send quota by 1,000 sends',
    'overage_pack',
    4900,
    'one_off',
    'email_sends',
    1000,
    'TOPUP-EMAILS-1000',
    120
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Verify table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'billing_addons_catalog'
  ) THEN
    RAISE NOTICE 'billing_addons_catalog table created successfully';
  ELSE
    RAISE EXCEPTION 'billing_addons_catalog table NOT found';
  END IF;

  -- Verify seed data
  SELECT COUNT(*) INTO v_count FROM billing_addons_catalog;
  RAISE NOTICE 'billing_addons_catalog has % rows', v_count;

  IF v_count >= 7 THEN
    RAISE NOTICE 'Seed data OK: % rows present (expected >= 7)', v_count;
  ELSE
    RAISE EXCEPTION 'Seed data INCOMPLETE: expected >= 7 rows, found %', v_count;
  END IF;

  -- Verify RLS policies
  IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'billing_addons_catalog') >= 2 THEN
    RAISE NOTICE 'billing_addons_catalog has % RLS policies', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'billing_addons_catalog');
  ELSE
    RAISE EXCEPTION 'billing_addons_catalog expected >= 2 RLS policies';
  END IF;

  RAISE NOTICE 'Migration 24_billing_addons_catalog completed successfully';
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
