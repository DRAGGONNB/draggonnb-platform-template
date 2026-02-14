-- ============================================================================
-- Migration: Operations Dashboard - Multi-Client Management
-- Created: 2026-02-14
-- Purpose: Client registry, health checks, and billing events for ops dashboard
--
-- NOTE: Apply this migration when managing 5+ clients.
-- This is DESIGN ONLY until that threshold is reached.
--
-- INSTRUCTIONS:
-- 1. Login to Supabase Dashboard: https://supabase.com/dashboard/project/psqfgzbjbgqrmjskdavs
-- 2. Navigate to: SQL Editor
-- 3. Copy this entire file contents
-- 4. Paste into SQL Editor
-- 5. Click "Run" to execute
-- ============================================================================

-- ============================================================================
-- TABLE 1: OPS_CLIENTS - Client Registry
-- ============================================================================
-- Central registry of all provisioned clients with resource references

CREATE TABLE IF NOT EXISTS ops_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  org_email TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('core', 'growth', 'scale')),
  modules JSONB NOT NULL DEFAULT '{}',
  branding JSONB NOT NULL DEFAULT '{}',
  integrations JSONB NOT NULL DEFAULT '{}',

  -- Resource references
  supabase_project_id TEXT,
  supabase_project_ref TEXT,
  github_repo_url TEXT,
  vercel_project_id TEXT,
  vercel_deployment_url TEXT,
  n8n_workflow_ids TEXT,

  -- Status
  billing_status TEXT NOT NULL DEFAULT 'trial'
    CHECK (billing_status IN ('trial', 'active', 'past_due', 'cancelled', 'suspended')),
  health_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (health_status IN ('healthy', 'degraded', 'down', 'unknown')),
  provisioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_health_check TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE 2: OPS_CLIENT_HEALTH - Health Check Snapshots
-- ============================================================================
-- Point-in-time health check results per client

CREATE TABLE IF NOT EXISTS ops_client_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL REFERENCES ops_clients(client_id) ON DELETE CASCADE,

  vercel_responds BOOLEAN NOT NULL DEFAULT false,
  supabase_connects BOOLEAN NOT NULL DEFAULT false,
  n8n_webhook_responds BOOLEAN NOT NULL DEFAULT false,
  login_page_loads BOOLEAN NOT NULL DEFAULT false,
  rls_enabled BOOLEAN NOT NULL DEFAULT false,
  all_passed BOOLEAN NOT NULL DEFAULT false,

  check_details JSONB,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE 3: OPS_BILLING_EVENTS - Payment Events Across All Clients
-- ============================================================================
-- Tracks billing lifecycle events for each client

CREATE TABLE IF NOT EXISTS ops_billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL REFERENCES ops_clients(client_id) ON DELETE CASCADE,

  event_type TEXT NOT NULL
    CHECK (event_type IN ('payment_received', 'payment_failed', 'subscription_created', 'subscription_cancelled', 'tier_changed', 'refund')),
  amount_zar INTEGER, -- amount in cents
  currency TEXT DEFAULT 'ZAR',
  payment_reference TEXT,
  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ops_clients_tier ON ops_clients(tier);
CREATE INDEX IF NOT EXISTS idx_ops_clients_billing ON ops_clients(billing_status);
CREATE INDEX IF NOT EXISTS idx_ops_clients_health ON ops_clients(health_status);
CREATE INDEX IF NOT EXISTS idx_ops_health_client ON ops_client_health(client_id);
CREATE INDEX IF NOT EXISTS idx_ops_health_checked ON ops_client_health(checked_at);
CREATE INDEX IF NOT EXISTS idx_ops_billing_client ON ops_billing_events(client_id);
CREATE INDEX IF NOT EXISTS idx_ops_billing_type ON ops_billing_events(event_type);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Only service_role can access ops tables (admin-only)

ALTER TABLE ops_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_client_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ops_clients"
  ON ops_clients FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on ops_client_health"
  ON ops_client_health FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on ops_billing_events"
  ON ops_billing_events FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_ops_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE TRIGGER trigger_ops_clients_updated_at
  BEFORE UPDATE ON ops_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_ops_clients_updated_at();
