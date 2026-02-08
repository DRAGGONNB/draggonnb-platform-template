-- DraggonnB CRMM - Initial Database Schema
-- Generated: 2025-12-01
-- Version: 1.0.0
-- Target: Supabase PostgreSQL 15+

-- ============================================================================
-- CRITICAL TABLES FOR MVP
-- These 7 tables are REQUIRED for basic functionality
-- ============================================================================

-- 1. ORGANIZATIONS TABLE
-- Stores client organization records
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subscription_tier TEXT NOT NULL DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
  subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'suspended', 'cancelled')),
  owner_id UUID NOT NULL, -- References auth.users(id) but not enforced yet

  -- PayFast integration
  payfast_subscription_token TEXT UNIQUE,
  payfast_merchant_reference TEXT,

  -- Billing dates
  next_billing_date DATE,
  last_payment_date DATE,
  trial_ends_at TIMESTAMP,
  activated_at TIMESTAMP,
  suspended_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(subscription_status);

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

-- 3. CLIENT_USAGE_METRICS TABLE
-- Tracks monthly usage for billing limits
CREATE TABLE IF NOT EXISTS client_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Current period usage
  posts_monthly INTEGER NOT NULL DEFAULT 0,
  ai_generations_monthly INTEGER NOT NULL DEFAULT 0,
  api_calls_monthly INTEGER NOT NULL DEFAULT 0,
  storage_used_mb INTEGER NOT NULL DEFAULT 0,

  -- Usage limits (based on subscription tier)
  posts_limit INTEGER NOT NULL DEFAULT 30,
  ai_generations_limit INTEGER NOT NULL DEFAULT 50,
  api_calls_limit INTEGER NOT NULL DEFAULT 1000,
  storage_limit_mb INTEGER NOT NULL DEFAULT 1000,

  -- Tracking
  reset_date TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Ensure one record per organization
  UNIQUE(organization_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_usage_organization_id ON client_usage_metrics(organization_id);

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

-- 5. SOCIAL_POSTS TABLE
-- Stores generated and published social media posts
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL,
  hashtags TEXT[],
  image_url TEXT,

  -- Platforms
  platforms TEXT[] NOT NULL DEFAULT ARRAY['linkedin'], -- e.g., ['linkedin', 'facebook', 'instagram']

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),

  -- Scheduling
  scheduled_for TIMESTAMP,
  published_at TIMESTAMP,

  -- Platform-specific IDs
  platform_post_ids JSONB, -- e.g., {"linkedin": "post_id_123", "facebook": "post_id_456"}

  -- Analytics
  total_engagements INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_posts_org_id ON social_posts(organization_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_for ON social_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON social_posts(created_at DESC);

-- 6. ANALYTICS_SNAPSHOTS TABLE
-- Daily/weekly/monthly analytics aggregates
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Snapshot period
  snapshot_date DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),

  -- Platform-specific metrics
  linkedin_posts INTEGER DEFAULT 0,
  linkedin_engagements INTEGER DEFAULT 0,
  linkedin_impressions INTEGER DEFAULT 0,

  facebook_posts INTEGER DEFAULT 0,
  facebook_engagements INTEGER DEFAULT 0,
  facebook_reach INTEGER DEFAULT 0,

  instagram_posts INTEGER DEFAULT 0,
  instagram_engagements INTEGER DEFAULT 0,
  instagram_impressions INTEGER DEFAULT 0,

  twitter_posts INTEGER DEFAULT 0,
  twitter_engagements INTEGER DEFAULT 0,
  twitter_impressions INTEGER DEFAULT 0,

  -- Aggregated totals
  total_posts INTEGER DEFAULT 0,
  total_engagements INTEGER DEFAULT 0,
  total_reach INTEGER DEFAULT 0,

  -- Engagement rate (calculated)
  engagement_rate DECIMAL(5, 2) DEFAULT 0.00,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Unique constraint: one snapshot per org per date per period
  UNIQUE(organization_id, snapshot_date, period_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_org_id ON analytics_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshot_date ON analytics_snapshots(snapshot_date DESC);

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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_metrics_updated_at BEFORE UPDATE ON client_usage_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON social_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_metrics_updated_at BEFORE UPDATE ON platform_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTION: Atomic User + Organization Creation
-- ============================================================================

CREATE OR REPLACE FUNCTION create_user_with_organization(
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  org_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Insert organization
  INSERT INTO organizations (name, subscription_tier, subscription_status, owner_id)
  VALUES (org_name, 'starter', 'trial', user_id)
  RETURNING id INTO new_org_id;

  -- Insert user
  INSERT INTO users (id, email, full_name, role, organization_id)
  VALUES (user_id, user_email, user_name, 'admin', new_org_id);

  -- Insert usage metrics
  INSERT INTO client_usage_metrics (organization_id)
  VALUES (new_org_id);

  RETURN new_org_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create organization: %', SQLERRM;
END;
$$;

-- ============================================================================
-- DEPLOYMENT VERIFICATION
-- ============================================================================

-- Run this query after deployment to verify all tables exist:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;

-- Expected tables:
-- 1. organizations
-- 2. users
-- 3. client_usage_metrics
-- 4. subscription_history
-- 5. social_posts
-- 6. analytics_snapshots
-- 7. platform_metrics

-- ============================================================================
-- END OF INITIAL SCHEMA
-- ============================================================================
