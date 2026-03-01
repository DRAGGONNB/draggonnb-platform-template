-- DraggonnB OS - WhatsApp Inbound Logging & Referral System
-- Migration: 12_whatsapp_and_referrals.sql

-- ============================================================================
-- WHATSAPP INBOUND LOG (service window tracking for free-tier messages)
-- ============================================================================

-- Note: whatsapp_inbound_log was created in 10_billing_foundation.sql
-- This migration adds indexes and the service window function

-- Add index for service window lookups (last 24h messages per phone)
CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_phone_created
  ON whatsapp_inbound_log (phone_number, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_direction
  ON whatsapp_inbound_log (phone_number, direction, created_at DESC)
  WHERE direction = 'inbound';

-- ============================================================================
-- SERVICE WINDOW FUNCTION
-- Meta allows free-form replies within 24h of last customer message
-- ============================================================================

CREATE OR REPLACE FUNCTION check_service_window(
  p_phone_number TEXT
)
RETURNS TABLE (
  is_open BOOLEAN,
  last_inbound_at TIMESTAMPTZ,
  window_expires_at TIMESTAMPTZ,
  minutes_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_last_inbound TIMESTAMPTZ;
BEGIN
  SELECT created_at INTO v_last_inbound
  FROM whatsapp_inbound_log
  WHERE phone_number = p_phone_number
    AND direction = 'inbound'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_inbound IS NULL THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, 0;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    (now() - v_last_inbound) < INTERVAL '24 hours',
    v_last_inbound,
    v_last_inbound + INTERVAL '24 hours',
    GREATEST(0, EXTRACT(EPOCH FROM (v_last_inbound + INTERVAL '24 hours' - now())) / 60)::INTEGER;
END;
$$;

-- ============================================================================
-- REFERRALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  referee_email TEXT, -- invited email (before they sign up)
  referee_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'signed_up', 'qualified', 'rewarded', 'expired')),
  signed_up_at TIMESTAMPTZ,
  qualified_at TIMESTAMPTZ, -- 60-day qualification mark
  reward_credit_id UUID REFERENCES tenant_credits(id), -- link to issued credit
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_code
  ON referrals (referral_code);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer
  ON referrals (referrer_organization_id, status);

CREATE INDEX IF NOT EXISTS idx_referrals_referee
  ON referrals (referee_email)
  WHERE status = 'pending';

-- Add referral_code column to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Referrals: users see referrals they created
CREATE POLICY "referrals_select" ON referrals
  FOR SELECT TO authenticated
  USING (
    referrer_organization_id IN (
      SELECT organization_id FROM users WHERE id = (SELECT auth.uid())
    )
  );

-- Referrals: service role can insert/update
CREATE POLICY "referrals_service_all" ON referrals
  FOR ALL TO service_role
  USING (true);

-- ============================================================================
-- FUNCTION: Generate unique referral code for an organization
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_referral_code(p_organization_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_org_name TEXT;
BEGIN
  -- Check if org already has a code
  SELECT referral_code INTO v_code FROM organizations WHERE id = p_organization_id;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  -- Generate code from org name + random suffix
  SELECT UPPER(LEFT(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g'), 6)) INTO v_org_name
  FROM organizations WHERE id = p_organization_id;

  v_code := COALESCE(v_org_name, 'REF') || '-' || UPPER(SUBSTR(gen_random_uuid()::TEXT, 1, 6));

  -- Save to organization
  UPDATE organizations SET referral_code = v_code WHERE id = p_organization_id;

  RETURN v_code;
END;
$$;
