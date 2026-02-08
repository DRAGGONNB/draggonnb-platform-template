-- =============================================================================
-- DraggonnB CRMM - Database Schema Template
-- =============================================================================
-- This schema is cloned to each new client Supabase project during provisioning.
-- Contains all tables, indexes, and RLS policies for complete data isolation.
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Users table (links to Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'member',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- CRM TABLES
-- =============================================================================

-- Contacts (leads/customers)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  company TEXT,
  title TEXT,
  status TEXT DEFAULT 'active',
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  size TEXT,
  revenue DECIMAL,
  website TEXT,
  description TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Deals (sales pipeline)
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value DECIMAL,
  stage TEXT DEFAULT 'lead',
  probability INTEGER DEFAULT 0,
  expected_close_date DATE,
  status TEXT DEFAULT 'open',
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Activities (calls, emails, meetings)
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  subject TEXT,
  description TEXT,
  due_date TIMESTAMPTZ,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- EMAIL TABLES
-- =============================================================================

-- Email campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  from_name TEXT,
  from_email TEXT,
  template_id UUID,
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  stats JSONB DEFAULT '{"sent": 0, "delivered": 0, "opened": 0, "clicked": 0, "bounced": 0}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Email sequences (drip campaigns)
CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB DEFAULT '[]',
  status TEXT DEFAULT 'inactive',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Email sends (individual email tracking)
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Email unsubscribes
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reason TEXT,
  unsubscribed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, email)
);

-- =============================================================================
-- SOCIAL MEDIA TABLES
-- =============================================================================

-- Social posts
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  platforms TEXT[] DEFAULT '{}',
  media_urls TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  stats JSONB DEFAULT '{"likes": 0, "comments": 0, "shares": 0, "reach": 0}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Social accounts (connected platforms)
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  account_name TEXT,
  account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, platform, account_id)
);

-- Content queue (AI-generated content waiting to be posted)
CREATE TABLE IF NOT EXISTS content_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  platforms TEXT[] DEFAULT '{}',
  media_urls TEXT[] DEFAULT '{}',
  suggested_time TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Content templates (AI generation prompts)
CREATE TABLE IF NOT EXISTS content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  platforms TEXT[] DEFAULT '{}',
  variables JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- BILLING & USAGE TABLES
-- =============================================================================

-- Client usage metrics (track against tier limits)
CREATE TABLE IF NOT EXISTS client_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  posts_created INTEGER DEFAULT 0,
  ai_generations INTEGER DEFAULT 0,
  social_accounts_connected INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  contacts_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, period_start)
);

-- Subscription history (PayFast payments)
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  status TEXT NOT NULL,
  payment_date TIMESTAMPTZ,
  next_billing_date DATE,
  payfast_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- ANALYTICS TABLES
-- =============================================================================

-- Analytics snapshots (daily rollups)
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, snapshot_date)
);

-- Platform metrics (system-level stats)
CREATE TABLE IF NOT EXISTS platform_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_value DECIMAL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- SYSTEM TABLES
-- =============================================================================

-- Notifications (in-app alerts)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log (change tracking)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  changes JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_companies_organization_id ON companies(organization_id);
CREATE INDEX IF NOT EXISTS idx_deals_organization_id ON deals(organization_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_activities_organization_id ON activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_organization_id ON email_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign_id ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_contact_id ON email_sends(contact_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_organization_id ON social_posts(organization_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_at ON social_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_audit_log_organization_id ON audit_log(organization_id);

-- =============================================================================
-- RLS (ROW LEVEL SECURITY) POLICIES
-- =============================================================================
-- Each user can only access data belonging to their organization
-- =============================================================================

-- Organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert organization during signup" ON organizations;
DROP POLICY IF EXISTS "Users can select own organization" ON organizations;
DROP POLICY IF EXISTS "Users can update own organization" ON organizations;

CREATE POLICY "Users can insert organization during signup" ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can select own organization" ON organizations
  FOR SELECT TO authenticated
  USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own organization" ON organizations
  FOR UPDATE TO authenticated
  USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own record during signup" ON users;
DROP POLICY IF EXISTS "Users can select same org or own record" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;

CREATE POLICY "Users can insert own record during signup" ON users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can select same org or own record" ON users
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    OR id = auth.uid()
  );

CREATE POLICY "Users can update own record" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Standard organization-scoped tables
-- Pattern: SELECT/INSERT/UPDATE/DELETE all filter by organization_id matching user's org

-- Contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage contacts in own org" ON contacts;

CREATE POLICY "Users can manage contacts in own org" ON contacts
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage companies in own org" ON companies;

CREATE POLICY "Users can manage companies in own org" ON companies
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Deals
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage deals in own org" ON deals;

CREATE POLICY "Users can manage deals in own org" ON deals
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Activities
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage activities in own org" ON activities;

CREATE POLICY "Users can manage activities in own org" ON activities
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Email campaigns
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage email campaigns in own org" ON email_campaigns;

CREATE POLICY "Users can manage email campaigns in own org" ON email_campaigns
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Email templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage email templates in own org" ON email_templates;

CREATE POLICY "Users can manage email templates in own org" ON email_templates
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Email sequences
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage email sequences in own org" ON email_sequences;

CREATE POLICY "Users can manage email sequences in own org" ON email_sequences
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Email sends
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view email sends in own org" ON email_sends;

CREATE POLICY "Users can view email sends in own org" ON email_sends
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Email unsubscribes
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view unsubscribes in own org" ON email_unsubscribes;

CREATE POLICY "Users can view unsubscribes in own org" ON email_unsubscribes
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Social posts
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage social posts in own org" ON social_posts;

CREATE POLICY "Users can manage social posts in own org" ON social_posts
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Social accounts
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage social accounts in own org" ON social_accounts;

CREATE POLICY "Users can manage social accounts in own org" ON social_accounts
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Content queue
ALTER TABLE content_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage content queue in own org" ON content_queue;

CREATE POLICY "Users can manage content queue in own org" ON content_queue
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Content templates
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage content templates in own org" ON content_templates;

CREATE POLICY "Users can manage content templates in own org" ON content_templates
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Client usage metrics (read-only for users)
ALTER TABLE client_usage_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view usage metrics in own org" ON client_usage_metrics;

CREATE POLICY "Users can view usage metrics in own org" ON client_usage_metrics
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Subscription history (read-only for users)
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view subscription history in own org" ON subscription_history;

CREATE POLICY "Users can view subscription history in own org" ON subscription_history
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Analytics snapshots (read-only for users)
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view analytics in own org" ON analytics_snapshots;

CREATE POLICY "Users can view analytics in own org" ON analytics_snapshots
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Platform metrics (read-only for users)
ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view platform metrics in own org" ON platform_metrics;

CREATE POLICY "Users can view platform metrics in own org" ON platform_metrics
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own notifications" ON notifications;

CREATE POLICY "Users can manage own notifications" ON notifications
  FOR ALL TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (user_id = auth.uid() OR user_id IS NULL)
  );

-- Audit log (read-only for users in own org)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view audit log in own org" ON audit_log;

CREATE POLICY "Users can view audit log in own org" ON audit_log
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
