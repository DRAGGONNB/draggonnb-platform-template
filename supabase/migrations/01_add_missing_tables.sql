-- DraggonnB CRMM - Missing Tables Migration
-- Created: 2025-12-26
-- Purpose: Add 3 missing critical tables (users, subscription_history, platform_metrics)
--
-- INSTRUCTIONS:
-- 1. Login to Supabase Dashboard: https://supabase.com/dashboard/project/psqfgzbjbgqrmjskdavs
-- 2. Navigate to: SQL Editor
-- 3. Copy this entire file contents
-- 4. Paste into SQL Editor
-- 5. Click "Run" to execute
-- 6. Re-run database verification: npm run db:verify

-- ============================================================================
-- MISSING TABLE 1: USERS
-- ============================================================================

-- 2. USERS TABLE
-- Stores user profiles linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Metadata
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- MISSING TABLE 2: SUBSCRIPTION_HISTORY
-- ============================================================================

-- 4. SUBSCRIPTION_HISTORY TABLE
-- Logs all payment transactions and subscription changes
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Transaction details
  transaction_id TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'payfast',
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),

  -- Amounts (South African Rand)
  amount_gross DECIMAL(10, 2) NOT NULL,
  amount_fee DECIMAL(10, 2),
  amount_net DECIMAL(10, 2),
  currency TEXT NOT NULL DEFAULT 'ZAR',

  -- PayFast specific
  payfast_response JSONB,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscription_history_org_id ON subscription_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_transaction_id ON subscription_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at DESC);

-- ============================================================================
-- MISSING TABLE 3: PLATFORM_METRICS
-- ============================================================================

-- 7. PLATFORM_METRICS TABLE
-- Per-post engagement metrics (linked to social_posts)
CREATE TABLE IF NOT EXISTS platform_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Platform
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'instagram', 'twitter')),
  platform_post_id TEXT,

  -- Engagement metrics
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,

  -- Calculated
  engagement_rate DECIMAL(5, 2) DEFAULT 0.00,

  -- Timestamp of last metrics update
  last_fetched_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_platform_metrics_post_id ON platform_metrics(post_id);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_org_id ON platform_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_platform ON platform_metrics(platform);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Ensure trigger function exists (it should from initial migration, but we'll be safe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to new tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_metrics_updated_at BEFORE UPDATE ON platform_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries after migration to verify success:

-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
-- Expected: 7 tables (analytics_snapshots, client_usage_metrics, organizations, platform_metrics, social_posts, subscription_history, users)

-- Verify record counts (should all be 0 initially)
SELECT
  'organizations' AS table_name, COUNT(*) AS record_count FROM organizations
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'client_usage_metrics', COUNT(*) FROM client_usage_metrics
UNION ALL
SELECT 'subscription_history', COUNT(*) FROM subscription_history
UNION ALL
SELECT 'social_posts', COUNT(*) FROM social_posts
UNION ALL
SELECT 'analytics_snapshots', COUNT(*) FROM analytics_snapshots
UNION ALL
SELECT 'platform_metrics', COUNT(*) FROM platform_metrics
ORDER BY table_name;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
