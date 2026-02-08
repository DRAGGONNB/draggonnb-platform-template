-- =====================================================
-- DraggonnB CRMM Database Setup Script
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/psqfgzbjbgqrmjskdavs/sql
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ORGANIZATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'past_due', 'cancelled', 'suspended')),
  payfast_subscription_token TEXT,
  billing_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. USERS TABLE (Links to auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =====================================================
-- 3. CLIENT USAGE METRICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS client_usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  posts_monthly INTEGER DEFAULT 0,
  ai_generations_monthly INTEGER DEFAULT 0,
  emails_sent_monthly INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  posts_limit INTEGER DEFAULT 30,
  ai_generations_limit INTEGER DEFAULT 50,
  emails_limit INTEGER DEFAULT 500,
  billing_period_start TIMESTAMPTZ DEFAULT NOW(),
  billing_period_end TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- =====================================================
-- 4. SUBSCRIPTION HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  payment_status TEXT,
  amount_gross DECIMAL(10,2),
  amount_fee DECIMAL(10,2),
  amount_net DECIMAL(10,2),
  payment_provider TEXT DEFAULT 'payfast',
  provider_transaction_id TEXT,
  tier_before TEXT,
  tier_after TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_org ON subscription_history(organization_id);

-- =====================================================
-- 5. SOCIAL POSTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content TEXT,
  platform TEXT CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'twitter', 'all')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'scheduled', 'published', 'failed')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  platform_post_id TEXT,
  media_urls TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_org ON social_posts(organization_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);

-- =====================================================
-- 6. PLATFORM METRICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS platform_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  total_engagements INTEGER DEFAULT 0,
  collected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_metrics_post ON platform_metrics(post_id);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_org ON platform_metrics(organization_id);

-- =====================================================
-- 7. ANALYTICS SNAPSHOTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  period_type TEXT DEFAULT 'daily' CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  total_posts INTEGER DEFAULT 0,
  total_engagements INTEGER DEFAULT 0,
  facebook_engagements INTEGER DEFAULT 0,
  instagram_engagements INTEGER DEFAULT 0,
  linkedin_engagements INTEGER DEFAULT 0,
  twitter_engagements INTEGER DEFAULT 0,
  total_reach INTEGER DEFAULT 0,
  avg_engagement_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_org ON analytics_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_date ON analytics_snapshots(snapshot_date);

-- =====================================================
-- 8. EMAIL TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  plain_text_content TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_org ON email_templates(organization_id);

-- =====================================================
-- 9. EMAIL CAMPAIGNS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_id UUID REFERENCES email_templates(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_org ON email_campaigns(organization_id);

-- =====================================================
-- 10. EMAIL SENDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES email_campaigns(id),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed')),
  provider TEXT DEFAULT 'resend',
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_sends_org ON email_sends(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status);

-- =====================================================
-- 11. EMAIL UNSUBSCRIBES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reason TEXT,
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
  resubscribed_at TIMESTAMPTZ,
  UNIQUE(organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_org ON email_unsubscribes(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email ON email_unsubscribes(email);

-- =====================================================
-- 12. EMAIL SEQUENCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT DEFAULT 'signup' CHECK (trigger_type IN ('signup', 'purchase', 'manual', 'date', 'event')),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_sequences_org ON email_sequences(organization_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for Organizations
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert organizations during signup" ON organizations;
CREATE POLICY "Users can insert organizations during signup" ON organizations
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- RLS Policies for Users
-- =====================================================
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
CREATE POLICY "Users can view users in their organization" ON users
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    OR id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can insert their own record" ON users;
CREATE POLICY "Users can insert their own record" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own record" ON users;
CREATE POLICY "Users can update their own record" ON users
  FOR UPDATE USING (id = auth.uid());

-- =====================================================
-- RLS Policies for Client Usage Metrics
-- =====================================================
DROP POLICY IF EXISTS "Users can view their organization metrics" ON client_usage_metrics;
CREATE POLICY "Users can view their organization metrics" ON client_usage_metrics
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert their organization metrics" ON client_usage_metrics;
CREATE POLICY "Users can insert their organization metrics" ON client_usage_metrics
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their organization metrics" ON client_usage_metrics;
CREATE POLICY "Users can update their organization metrics" ON client_usage_metrics
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- =====================================================
-- RLS Policies for Subscription History
-- =====================================================
DROP POLICY IF EXISTS "Users can view their org subscription history" ON subscription_history;
CREATE POLICY "Users can view their org subscription history" ON subscription_history
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- =====================================================
-- RLS Policies for Social Posts
-- =====================================================
DROP POLICY IF EXISTS "Users can view their organization posts" ON social_posts;
CREATE POLICY "Users can view their organization posts" ON social_posts
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create posts for their organization" ON social_posts;
CREATE POLICY "Users can create posts for their organization" ON social_posts
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update posts in their organization" ON social_posts;
CREATE POLICY "Users can update posts in their organization" ON social_posts
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- =====================================================
-- RLS Policies for Platform Metrics
-- =====================================================
DROP POLICY IF EXISTS "Users can view their organization metrics" ON platform_metrics;
CREATE POLICY "Users can view their organization metrics" ON platform_metrics
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- =====================================================
-- RLS Policies for Analytics Snapshots
-- =====================================================
DROP POLICY IF EXISTS "Users can view their organization analytics" ON analytics_snapshots;
CREATE POLICY "Users can view their organization analytics" ON analytics_snapshots
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- =====================================================
-- RLS Policies for Email Tables
-- =====================================================
DROP POLICY IF EXISTS "Users can view their org email templates" ON email_templates;
CREATE POLICY "Users can view their org email templates" ON email_templates
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage their org email templates" ON email_templates;
CREATE POLICY "Users can manage their org email templates" ON email_templates
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view their org email campaigns" ON email_campaigns;
CREATE POLICY "Users can view their org email campaigns" ON email_campaigns
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage their org email campaigns" ON email_campaigns;
CREATE POLICY "Users can manage their org email campaigns" ON email_campaigns
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view their org email sends" ON email_sends;
CREATE POLICY "Users can view their org email sends" ON email_sends
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage their org email sends" ON email_sends;
CREATE POLICY "Users can manage their org email sends" ON email_sends
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view their org email unsubscribes" ON email_unsubscribes;
CREATE POLICY "Users can view their org email unsubscribes" ON email_unsubscribes
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view their org email sequences" ON email_sequences;
CREATE POLICY "Users can view their org email sequences" ON email_sequences
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage their org email sequences" ON email_sequences;
CREATE POLICY "Users can manage their org email sequences" ON email_sequences
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- =====================================================
-- SERVICE ROLE BYPASS FOR WEBHOOKS
-- (These policies allow service_role to bypass RLS for webhook operations)
-- =====================================================
-- Note: Service role key already bypasses RLS by default in Supabase

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_usage_metrics_updated_at ON client_usage_metrics;
CREATE TRIGGER update_client_usage_metrics_updated_at
    BEFORE UPDATE ON client_usage_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_social_posts_updated_at ON social_posts;
CREATE TRIGGER update_social_posts_updated_at
    BEFORE UPDATE ON social_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_campaigns_updated_at ON email_campaigns;
CREATE TRIGGER update_email_campaigns_updated_at
    BEFORE UPDATE ON email_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_sequences_updated_at ON email_sequences;
CREATE TRIGGER update_email_sequences_updated_at
    BEFORE UPDATE ON email_sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'DraggonnB CRMM Database Setup Complete!';
  RAISE NOTICE 'Tables created: organizations, users, client_usage_metrics,';
  RAISE NOTICE '  subscription_history, social_posts, platform_metrics,';
  RAISE NOTICE '  analytics_snapshots, email_templates, email_campaigns,';
  RAISE NOTICE '  email_sends, email_unsubscribes, email_sequences';
  RAISE NOTICE 'RLS policies enabled for all tables';
  RAISE NOTICE 'Updated_at triggers configured';
  RAISE NOTICE '==============================================';
END $$;
