-- =============================================================================
-- RLS (Row Level Security) Policies for DraggonnB CRMM
-- =============================================================================
--
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
--
-- This script enables RLS on all organization-scoped tables and creates policies
-- for organization-level data isolation. Each user can only access data belonging
-- to their organization.
--
-- SAFE TO RUN MULTIPLE TIMES (idempotent) - uses DROP POLICY IF EXISTS
--
-- Tables covered:
--   - organizations (special: signup + own org access)
--   - users (special: signup + same org read + own record update)
--   - contacts, companies, deals, activities (CRM)
--   - email_campaigns, email_templates, email_sequences, email_sends, email_unsubscribes (Email)
--   - social_posts, social_accounts, content_queue, content_templates (Social)
--   - client_usage_metrics, subscription_history (Billing - read only for users)
--   - analytics_snapshots, platform_metrics (Analytics - read only)
--   - notifications, audit_log (System)
--
-- IMPORTANT: Webhook handlers (PayFast, Resend) use admin client which bypasses RLS.
--
-- =============================================================================


-- =============================================================================
-- SPECIAL TABLE: organizations
-- =============================================================================
-- Users can:
--   - INSERT during signup (authenticated users can create orgs)
--   - SELECT their own organization only
--   - UPDATE their own organization only
--   - DELETE is restricted (admin only via service role)

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert organization during signup" ON organizations;
DROP POLICY IF EXISTS "Users can select own organization" ON organizations;
DROP POLICY IF EXISTS "Users can update own organization" ON organizations;

-- INSERT: Allow authenticated users to create organizations (needed during signup)
CREATE POLICY "Users can insert organization during signup" ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- SELECT: Users can only see the organization they belong to
CREATE POLICY "Users can select own organization" ON organizations
  FOR SELECT TO authenticated
  USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- UPDATE: Users can only update their own organization
CREATE POLICY "Users can update own organization" ON organizations
  FOR UPDATE TO authenticated
  USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- No DELETE policy - organizations are deleted via admin client only


-- =============================================================================
-- SPECIAL TABLE: users
-- =============================================================================
-- Users can:
--   - INSERT their own record during signup (id must match auth.uid())
--   - SELECT users in the same organization OR their own record
--   - UPDATE only their own record
--   - DELETE is restricted (admin only)

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert own record during signup" ON users;
DROP POLICY IF EXISTS "Users can select same org or own record" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;

-- INSERT: Users can only insert their own record (id = auth.uid())
CREATE POLICY "Users can insert own record during signup" ON users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- SELECT: Users can see other users in their organization OR their own record
CREATE POLICY "Users can select same org or own record" ON users
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    OR id = auth.uid()
  );

-- UPDATE: Users can only update their own record
CREATE POLICY "Users can update own record" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- No DELETE policy - user deletion via admin client only

-- Performance index
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);


-- =============================================================================
-- CRM TABLES: contacts, companies, deals, activities
-- =============================================================================
-- Standard org-scoped CRUD: all operations filtered by organization_id

-- CONTACTS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select contacts" ON contacts;
DROP POLICY IF EXISTS "Org members can insert contacts" ON contacts;
DROP POLICY IF EXISTS "Org members can update contacts" ON contacts;
DROP POLICY IF EXISTS "Org members can delete contacts" ON contacts;

CREATE POLICY "Org members can select contacts" ON contacts
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can insert contacts" ON contacts
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can update contacts" ON contacts
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can delete contacts" ON contacts
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id);


-- COMPANIES
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select companies" ON companies;
DROP POLICY IF EXISTS "Org members can insert companies" ON companies;
DROP POLICY IF EXISTS "Org members can update companies" ON companies;
DROP POLICY IF EXISTS "Org members can delete companies" ON companies;

CREATE POLICY "Org members can select companies" ON companies
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can insert companies" ON companies
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can update companies" ON companies
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can delete companies" ON companies
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_companies_organization_id ON companies(organization_id);


-- DEALS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select deals" ON deals;
DROP POLICY IF EXISTS "Org members can insert deals" ON deals;
DROP POLICY IF EXISTS "Org members can update deals" ON deals;
DROP POLICY IF EXISTS "Org members can delete deals" ON deals;

CREATE POLICY "Org members can select deals" ON deals
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can insert deals" ON deals
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can update deals" ON deals
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can delete deals" ON deals
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_deals_organization_id ON deals(organization_id);


-- ACTIVITIES
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select activities" ON activities;
DROP POLICY IF EXISTS "Org members can insert activities" ON activities;
DROP POLICY IF EXISTS "Org members can update activities" ON activities;
DROP POLICY IF EXISTS "Org members can delete activities" ON activities;

CREATE POLICY "Org members can select activities" ON activities
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can insert activities" ON activities
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can update activities" ON activities
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can delete activities" ON activities
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_activities_organization_id ON activities(organization_id);


-- =============================================================================
-- EMAIL TABLES: email_campaigns, email_templates, email_sequences,
--               email_sends, email_unsubscribes
-- =============================================================================

-- EMAIL_CAMPAIGNS
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select email_campaigns" ON email_campaigns;
DROP POLICY IF EXISTS "Org members can insert email_campaigns" ON email_campaigns;
DROP POLICY IF EXISTS "Org members can update email_campaigns" ON email_campaigns;
DROP POLICY IF EXISTS "Org members can delete email_campaigns" ON email_campaigns;

CREATE POLICY "Org members can select email_campaigns" ON email_campaigns
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can insert email_campaigns" ON email_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can update email_campaigns" ON email_campaigns
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can delete email_campaigns" ON email_campaigns
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_email_campaigns_organization_id ON email_campaigns(organization_id);


-- EMAIL_TEMPLATES
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select email_templates" ON email_templates;
DROP POLICY IF EXISTS "Org members can insert email_templates" ON email_templates;
DROP POLICY IF EXISTS "Org members can update email_templates" ON email_templates;
DROP POLICY IF EXISTS "Org members can delete email_templates" ON email_templates;

CREATE POLICY "Org members can select email_templates" ON email_templates
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can insert email_templates" ON email_templates
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can update email_templates" ON email_templates
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can delete email_templates" ON email_templates
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_email_templates_organization_id ON email_templates(organization_id);


-- EMAIL_SEQUENCES
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select email_sequences" ON email_sequences;
DROP POLICY IF EXISTS "Org members can insert email_sequences" ON email_sequences;
DROP POLICY IF EXISTS "Org members can update email_sequences" ON email_sequences;
DROP POLICY IF EXISTS "Org members can delete email_sequences" ON email_sequences;

CREATE POLICY "Org members can select email_sequences" ON email_sequences
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can insert email_sequences" ON email_sequences
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can update email_sequences" ON email_sequences
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can delete email_sequences" ON email_sequences
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_email_sequences_organization_id ON email_sequences(organization_id);


-- EMAIL_SENDS
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select email_sends" ON email_sends;
DROP POLICY IF EXISTS "Org members can insert email_sends" ON email_sends;
DROP POLICY IF EXISTS "Org members can update email_sends" ON email_sends;
DROP POLICY IF EXISTS "Org members can delete email_sends" ON email_sends;

CREATE POLICY "Org members can select email_sends" ON email_sends
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can insert email_sends" ON email_sends
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can update email_sends" ON email_sends
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can delete email_sends" ON email_sends
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_email_sends_organization_id ON email_sends(organization_id);


-- EMAIL_UNSUBSCRIBES
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select email_unsubscribes" ON email_unsubscribes;
DROP POLICY IF EXISTS "Org members can insert email_unsubscribes" ON email_unsubscribes;
DROP POLICY IF EXISTS "Org members can update email_unsubscribes" ON email_unsubscribes;
DROP POLICY IF EXISTS "Org members can delete email_unsubscribes" ON email_unsubscribes;

CREATE POLICY "Org members can select email_unsubscribes" ON email_unsubscribes
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can insert email_unsubscribes" ON email_unsubscribes
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can update email_unsubscribes" ON email_unsubscribes
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can delete email_unsubscribes" ON email_unsubscribes
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_organization_id ON email_unsubscribes(organization_id);


-- =============================================================================
-- SOCIAL TABLES: social_posts, social_accounts, content_queue, content_templates
-- =============================================================================

-- SOCIAL_POSTS
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select social_posts" ON social_posts;
DROP POLICY IF EXISTS "Org members can insert social_posts" ON social_posts;
DROP POLICY IF EXISTS "Org members can update social_posts" ON social_posts;
DROP POLICY IF EXISTS "Org members can delete social_posts" ON social_posts;

CREATE POLICY "Org members can select social_posts" ON social_posts
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can insert social_posts" ON social_posts
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can update social_posts" ON social_posts
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can delete social_posts" ON social_posts
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_social_posts_organization_id ON social_posts(organization_id);


-- SOCIAL_ACCOUNTS
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select social_accounts" ON social_accounts;
DROP POLICY IF EXISTS "Org members can insert social_accounts" ON social_accounts;
DROP POLICY IF EXISTS "Org members can update social_accounts" ON social_accounts;
DROP POLICY IF EXISTS "Org members can delete social_accounts" ON social_accounts;

CREATE POLICY "Org members can select social_accounts" ON social_accounts
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can insert social_accounts" ON social_accounts
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can update social_accounts" ON social_accounts
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can delete social_accounts" ON social_accounts
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_social_accounts_organization_id ON social_accounts(organization_id);


-- CONTENT_QUEUE
ALTER TABLE content_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select content_queue" ON content_queue;
DROP POLICY IF EXISTS "Org members can insert content_queue" ON content_queue;
DROP POLICY IF EXISTS "Org members can update content_queue" ON content_queue;
DROP POLICY IF EXISTS "Org members can delete content_queue" ON content_queue;

CREATE POLICY "Org members can select content_queue" ON content_queue
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can insert content_queue" ON content_queue
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can update content_queue" ON content_queue
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can delete content_queue" ON content_queue
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_content_queue_organization_id ON content_queue(organization_id);


-- CONTENT_TEMPLATES
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select content_templates" ON content_templates;
DROP POLICY IF EXISTS "Org members can insert content_templates" ON content_templates;
DROP POLICY IF EXISTS "Org members can update content_templates" ON content_templates;
DROP POLICY IF EXISTS "Org members can delete content_templates" ON content_templates;

CREATE POLICY "Org members can select content_templates" ON content_templates
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can insert content_templates" ON content_templates
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can update content_templates" ON content_templates
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can delete content_templates" ON content_templates
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_content_templates_organization_id ON content_templates(organization_id);


-- =============================================================================
-- BILLING TABLES: client_usage_metrics, subscription_history
-- =============================================================================
-- Users can SELECT only (read their usage and payment history)
-- INSERT/UPDATE/DELETE handled by admin client (webhooks, backend)

-- CLIENT_USAGE_METRICS
ALTER TABLE client_usage_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select usage metrics" ON client_usage_metrics;

CREATE POLICY "Org members can select usage metrics" ON client_usage_metrics
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- No INSERT/UPDATE/DELETE policies - admin client handles writes

CREATE INDEX IF NOT EXISTS idx_client_usage_metrics_organization_id ON client_usage_metrics(organization_id);


-- SUBSCRIPTION_HISTORY
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select subscription history" ON subscription_history;

CREATE POLICY "Org members can select subscription history" ON subscription_history
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- No INSERT/UPDATE/DELETE policies - PayFast webhook (admin client) handles writes

CREATE INDEX IF NOT EXISTS idx_subscription_history_organization_id ON subscription_history(organization_id);


-- =============================================================================
-- ANALYTICS TABLES: analytics_snapshots, platform_metrics
-- =============================================================================
-- Users can SELECT only (view analytics)
-- Writes handled by N8N workflows via admin client

-- ANALYTICS_SNAPSHOTS
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select analytics_snapshots" ON analytics_snapshots;

CREATE POLICY "Org members can select analytics_snapshots" ON analytics_snapshots
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- No INSERT/UPDATE/DELETE policies - N8N workflow (admin client) handles writes

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_organization_id ON analytics_snapshots(organization_id);


-- PLATFORM_METRICS
ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select platform_metrics" ON platform_metrics;

CREATE POLICY "Org members can select platform_metrics" ON platform_metrics
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- No INSERT/UPDATE/DELETE policies - N8N workflow (admin client) handles writes

CREATE INDEX IF NOT EXISTS idx_platform_metrics_organization_id ON platform_metrics(organization_id);


-- =============================================================================
-- SYSTEM TABLES: notifications, audit_log
-- =============================================================================

-- NOTIFICATIONS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select notifications" ON notifications;
DROP POLICY IF EXISTS "Org members can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Org members can update notifications" ON notifications;
DROP POLICY IF EXISTS "Org members can delete notifications" ON notifications;

CREATE POLICY "Org members can select notifications" ON notifications
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can insert notifications" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can update notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can delete notifications" ON notifications
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);


-- AUDIT_LOG
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select audit_log" ON audit_log;
DROP POLICY IF EXISTS "Org members can insert audit_log" ON audit_log;

-- SELECT: Users can view audit logs for their organization
CREATE POLICY "Org members can select audit_log" ON audit_log
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- INSERT: Users can create audit log entries for their organization
CREATE POLICY "Org members can insert audit_log" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- No UPDATE/DELETE policies - audit logs should be immutable

CREATE INDEX IF NOT EXISTS idx_audit_log_organization_id ON audit_log(organization_id);


-- =============================================================================
-- VERIFICATION: Check that RLS is enabled on all tables
-- =============================================================================
-- Run this query to verify RLS is properly enabled after running the script

SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;

-- Expected: 19 tables with RLS enabled:
-- activities, analytics_snapshots, audit_log, client_usage_metrics, companies,
-- contacts, content_queue, content_templates, deals, email_campaigns,
-- email_sends, email_sequences, email_templates, email_unsubscribes,
-- notifications, organizations, platform_metrics, social_accounts,
-- social_posts, subscription_history, users
