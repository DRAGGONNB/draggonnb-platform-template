-- DraggonnB OS - Billing Foundation
-- Migration: 10_billing_foundation.sql
-- Date: 2026-03-01
-- Purpose: Event-sourced usage metering, DB-driven billing plans, tenant subscriptions, WhatsApp inbound logging

-- ============================================================================
-- BILLING PLANS (DB-driven pricing, replaces hardcoded PRICING_TIERS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  price_zar INTEGER NOT NULL, -- cents (150000 = R1,500.00)
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'annual')),
  payfast_item_code TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  features JSONB NOT NULL DEFAULT '[]', -- array of feature description strings
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PLAN LIMITS (per-dimension allowances for each plan)
-- ============================================================================

CREATE TABLE IF NOT EXISTS plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES billing_plans(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL, -- 'ai_generations', 'social_posts', 'email_sends', etc.
  included_quantity INTEGER NOT NULL,
  overage_rate_zar INTEGER NOT NULL DEFAULT 0, -- per-unit overage in cents
  UNIQUE(plan_id, dimension)
);

CREATE INDEX IF NOT EXISTS idx_plan_limits_plan_id ON plan_limits(plan_id);

-- ============================================================================
-- TENANT SUBSCRIPTIONS (per-organization billing state)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES billing_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'suspended')),
  current_period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  current_period_end DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month')::DATE,
  payfast_token TEXT, -- for recurring charges
  payfast_subscription_id TEXT,
  legacy_pricing BOOLEAN NOT NULL DEFAULT false, -- flag for pre-migration orgs
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_plan ON tenant_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON tenant_subscriptions(status);

-- ============================================================================
-- USAGE EVENTS (event-sourced metering log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL, -- 'ai_generations', 'social_posts', 'email_sends', 'agent_invocations', etc.
  quantity INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}', -- { model, tokens_in, tokens_out, template_name, etc. }
  module TEXT, -- 'crmm', 'accommodation', 'vdj', 'restaurant', 'events'
  billing_period_start DATE, -- denormalized for fast period queries
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_org_dim_created
  ON usage_events(organization_id, dimension, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_events_billing_period
  ON usage_events(organization_id, billing_period_start, dimension);
CREATE INDEX IF NOT EXISTS idx_usage_events_created
  ON usage_events(created_at);

-- ============================================================================
-- WHATSAPP INBOUND LOG (service window tracking for free messages)
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_inbound_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  sender_phone TEXT NOT NULL,
  wa_message_id TEXT,
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'button', 'interactive'
  content_preview TEXT, -- first 200 chars for debugging
  metadata JSONB NOT NULL DEFAULT '{}',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_org_phone
  ON whatsapp_inbound_log(organization_id, sender_phone, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_received
  ON whatsapp_inbound_log(received_at);

-- ============================================================================
-- SEED BILLING PLANS (current pricing: core R1,500, growth R3,500, scale R7,500)
-- ============================================================================

INSERT INTO billing_plans (slug, name, price_zar, frequency, payfast_item_code, is_active, features, sort_order)
VALUES
  ('core', 'Core', 150000, 'monthly', 'DRG-CORE', true,
   '["Social CRM (contacts, companies, deals pipeline)","Complete email management (campaigns, sequences, templates, tracking)","1 custom business automation","30 social posts per month","50 AI content generations","1,000 emails per month","3 social accounts","2 team users"]'::JSONB,
   1),
  ('growth', 'Growth', 350000, 'monthly', 'DRG-GROWTH', true,
   '["Everything in Core, plus:","3+ business automations from template library","AI content generation for all channels","Advanced email automation (behavioral triggers, A/B testing, smart segmentation)","Smart lead pipeline (social engagement to CRM to automated nurture)","100 social posts per month","200 AI content generations","10,000 emails per month","10 social accounts","5 team users"]'::JSONB,
   2),
  ('scale', 'Scale', 750000, 'monthly', 'DRG-SCALE', true,
   '["Everything in Growth, plus:","White label (custom domain, branding, remove DraggonnB branding)","AI agents for client operations (customer support bot, lead responder, content autopilot)","Unlimited social posts, AI generations, emails","Unlimited social accounts and team users","API access and custom integrations","3 AI agents included (1,000 invocations/month)"]'::JSONB,
   3)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SEED PLAN LIMITS
-- ============================================================================

-- Core plan limits
INSERT INTO plan_limits (plan_id, dimension, included_quantity, overage_rate_zar)
SELECT bp.id, dim.dimension, dim.included_quantity, dim.overage_rate_zar
FROM billing_plans bp
CROSS JOIN (VALUES
  ('social_posts', 30, 0),
  ('ai_generations', 50, 15), -- R0.15 per extra generation
  ('email_sends', 1000, 0),
  ('social_accounts', 3, 0),
  ('team_users', 2, 0),
  ('agent_invocations', 10, 25), -- R0.25 per extra invocation
  ('autopilot_runs', 2, 0)
) AS dim(dimension, included_quantity, overage_rate_zar)
WHERE bp.slug = 'core'
ON CONFLICT (plan_id, dimension) DO NOTHING;

-- Growth plan limits
INSERT INTO plan_limits (plan_id, dimension, included_quantity, overage_rate_zar)
SELECT bp.id, dim.dimension, dim.included_quantity, dim.overage_rate_zar
FROM billing_plans bp
CROSS JOIN (VALUES
  ('social_posts', 100, 0),
  ('ai_generations', 200, 12), -- R0.12 per extra
  ('email_sends', 10000, 0),
  ('social_accounts', 10, 0),
  ('team_users', 5, 0),
  ('agent_invocations', 50, 20),
  ('autopilot_runs', 4, 0)
) AS dim(dimension, included_quantity, overage_rate_zar)
WHERE bp.slug = 'growth'
ON CONFLICT (plan_id, dimension) DO NOTHING;

-- Scale plan limits (effectively unlimited for most dimensions)
INSERT INTO plan_limits (plan_id, dimension, included_quantity, overage_rate_zar)
SELECT bp.id, dim.dimension, dim.included_quantity, dim.overage_rate_zar
FROM billing_plans bp
CROSS JOIN (VALUES
  ('social_posts', 999999, 0),
  ('ai_generations', 999999, 10),
  ('email_sends', 999999, 0),
  ('social_accounts', 999999, 0),
  ('team_users', 999999, 0),
  ('agent_invocations', 1000, 15),
  ('autopilot_runs', 999999, 0)
) AS dim(dimension, included_quantity, overage_rate_zar)
WHERE bp.slug = 'scale'
ON CONFLICT (plan_id, dimension) DO NOTHING;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_inbound_log ENABLE ROW LEVEL SECURITY;

-- Billing plans: readable by all authenticated users (public pricing)
CREATE POLICY "billing_plans_select" ON billing_plans
  FOR SELECT TO authenticated
  USING (true);

-- Plan limits: readable by all authenticated users
CREATE POLICY "plan_limits_select" ON plan_limits
  FOR SELECT TO authenticated
  USING (true);

-- Tenant subscriptions: users can only see their own org's subscription
CREATE POLICY "tenant_subscriptions_select" ON tenant_subscriptions
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = (SELECT auth.uid())
    )
  );

-- Usage events: users can only see their own org's events
CREATE POLICY "usage_events_select" ON usage_events
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = (SELECT auth.uid())
    )
  );

-- Usage events: service role can insert (used by metering pipeline)
CREATE POLICY "usage_events_service_insert" ON usage_events
  FOR INSERT TO service_role
  WITH CHECK (true);

-- WhatsApp inbound log: users can see their own org's messages
CREATE POLICY "whatsapp_inbound_select" ON whatsapp_inbound_log
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = (SELECT auth.uid())
    )
  );

-- WhatsApp inbound log: service role can insert
CREATE POLICY "whatsapp_inbound_service_insert" ON whatsapp_inbound_log
  FOR INSERT TO service_role
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTION: Get billing period start for an organization
-- ============================================================================

CREATE OR REPLACE FUNCTION get_billing_period_start(p_organization_id UUID)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  period_start DATE;
BEGIN
  SELECT current_period_start INTO period_start
  FROM tenant_subscriptions
  WHERE organization_id = p_organization_id AND status IN ('active', 'trialing')
  LIMIT 1;

  -- Fallback to first of current month if no subscription
  RETURN COALESCE(period_start, date_trunc('month', CURRENT_DATE)::DATE);
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: Get usage count for a dimension in current billing period
-- ============================================================================

CREATE OR REPLACE FUNCTION get_period_usage(
  p_organization_id UUID,
  p_dimension TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  period_start DATE;
  total INTEGER;
BEGIN
  period_start := get_billing_period_start(p_organization_id);

  SELECT COALESCE(SUM(quantity), 0) INTO total
  FROM usage_events
  WHERE organization_id = p_organization_id
    AND dimension = p_dimension
    AND created_at >= period_start;

  RETURN total;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_billing_plans_updated_at BEFORE UPDATE ON billing_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_subscriptions_updated_at BEFORE UPDATE ON tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUTO-POPULATE billing_period_start ON USAGE EVENT INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION set_usage_event_billing_period()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.billing_period_start IS NULL THEN
    NEW.billing_period_start := get_billing_period_start(NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER usage_events_set_billing_period
  BEFORE INSERT ON usage_events
  FOR EACH ROW EXECUTE FUNCTION set_usage_event_billing_period();

-- ============================================================================
-- END OF BILLING FOUNDATION
-- ============================================================================
