-- DraggonnB CRMM - Email Automation Schema
-- Migration: 02_email_automation.sql
-- Created: 2026-01-15
-- Purpose: Add email marketing and automation tables

-- ============================================================================
-- EMAIL TEMPLATES TABLE
-- Stores reusable email templates with drag-and-drop editor JSON
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Template info
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,

  -- Content
  html_content TEXT NOT NULL,
  text_content TEXT,
  editor_json JSONB, -- Stores the drag-and-drop editor state for re-editing

  -- Variables used in template (for validation and UI hints)
  variables JSONB DEFAULT '[]'::JSONB, -- e.g., ["first_name", "company_name", "unsubscribe_url"]

  -- Categorization
  category TEXT DEFAULT 'general' CHECK (category IN ('welcome', 'newsletter', 'promotional', 'transactional', 'general')),

  -- Thumbnail for template selection
  thumbnail_url TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_org_id ON email_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);

-- ============================================================================
-- EMAIL CAMPAIGNS TABLE
-- Stores broadcast email campaigns
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Campaign info
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT, -- Email preview text

  -- Template reference
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,

  -- If not using template, store direct content
  html_content TEXT,
  text_content TEXT,

  -- Campaign status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),

  -- Audience targeting
  segment_rules JSONB DEFAULT '{}'::JSONB, -- e.g., {"subscription_tier": ["professional", "enterprise"], "tags": ["active"]}
  recipient_count INTEGER DEFAULT 0,

  -- Scheduling
  scheduled_for TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Stats (updated in real-time)
  stats JSONB DEFAULT '{"sent": 0, "delivered": 0, "opened": 0, "clicked": 0, "bounced": 0, "unsubscribed": 0}'::JSONB,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_campaigns_org_id ON email_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled ON email_campaigns(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at DESC);

-- ============================================================================
-- EMAIL SEQUENCES TABLE
-- Stores automated email sequences (drip campaigns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Sequence info
  name TEXT NOT NULL,
  description TEXT,

  -- Trigger configuration
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('signup', 'subscription_change', 'tag_added', 'inactivity', 'custom_event', 'manual')),
  trigger_rules JSONB DEFAULT '{}'::JSONB, -- e.g., {"subscription_tier": "starter", "days_inactive": 7}

  -- Sequence settings
  is_active BOOLEAN DEFAULT false,
  allow_reenroll BOOLEAN DEFAULT false, -- Can contacts re-enter this sequence?
  exit_on_reply BOOLEAN DEFAULT true, -- Exit sequence if contact replies

  -- Stats
  total_enrolled INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_sequences_org_id ON email_sequences(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_sequences_active ON email_sequences(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_email_sequences_trigger ON email_sequences(trigger_type);

-- ============================================================================
-- EMAIL SEQUENCE STEPS TABLE
-- Individual steps within a sequence
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,

  -- Step order (1, 2, 3, etc.)
  step_order INTEGER NOT NULL,

  -- Step type
  step_type TEXT NOT NULL DEFAULT 'email' CHECK (step_type IN ('email', 'wait', 'condition', 'action')),

  -- For email steps
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  subject_override TEXT, -- Override template subject

  -- Delay before this step (from previous step or enrollment)
  delay_days INTEGER DEFAULT 0,
  delay_hours INTEGER DEFAULT 0,
  delay_minutes INTEGER DEFAULT 0,

  -- Conditions for this step
  conditions JSONB DEFAULT '{}'::JSONB, -- e.g., {"if_not_opened_previous": true, "if_clicked_link": "pricing"}

  -- Step-specific stats
  stats JSONB DEFAULT '{"sent": 0, "opened": 0, "clicked": 0}'::JSONB,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Unique order per sequence
  UNIQUE(sequence_id, step_order)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence_id ON email_sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_order ON email_sequence_steps(sequence_id, step_order);

-- ============================================================================
-- EMAIL SENDS TABLE
-- Tracks every email sent (for campaigns and sequences)
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Source (campaign or sequence)
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  sequence_id UUID REFERENCES email_sequences(id) ON DELETE SET NULL,
  sequence_step_id UUID REFERENCES email_sequence_steps(id) ON DELETE SET NULL,

  -- Recipient info
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Email content (at time of send)
  subject TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed', 'failed')),

  -- Timestamps
  queued_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  bounced_at TIMESTAMP,
  failed_at TIMESTAMP,

  -- Provider info
  provider TEXT DEFAULT 'resend',
  provider_message_id TEXT,
  provider_response JSONB,

  -- Error tracking
  error_message TEXT,
  error_code TEXT,

  -- Engagement tracking
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  clicked_links JSONB DEFAULT '[]'::JSONB, -- Array of clicked URLs

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_sends_org_id ON email_sends(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign_id ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_sequence_id ON email_sends(sequence_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_recipient ON email_sends(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status);
CREATE INDEX IF NOT EXISTS idx_email_sends_created_at ON email_sends(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_sends_provider_id ON email_sends(provider_message_id);

-- ============================================================================
-- SEQUENCE ENROLLMENTS TABLE
-- Tracks contacts enrolled in sequences
-- ============================================================================

CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,

  -- Contact info
  contact_email TEXT NOT NULL,
  contact_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Progress tracking
  current_step INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'exited', 'failed')),

  -- Timestamps
  enrolled_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_step_at TIMESTAMP,
  next_step_at TIMESTAMP,
  completed_at TIMESTAMP,
  exited_at TIMESTAMP,

  -- Exit reason
  exit_reason TEXT, -- e.g., "replied", "unsubscribed", "manual", "completed"

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,

  -- Prevent duplicate enrollments
  UNIQUE(sequence_id, contact_email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_org_id ON sequence_enrollments(organization_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_sequence_id ON sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_status ON sequence_enrollments(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_next_step ON sequence_enrollments(next_step_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_contact ON sequence_enrollments(contact_email);

-- ============================================================================
-- OUTREACH RULES TABLE
-- Tier-based and service-based automation rules
-- ============================================================================

CREATE TABLE IF NOT EXISTS outreach_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL for global rules

  -- Rule info
  name TEXT NOT NULL,
  description TEXT,

  -- Targeting
  subscription_tiers TEXT[] DEFAULT ARRAY['starter', 'professional', 'enterprise'],
  service_types TEXT[], -- e.g., ['social_automation', 'crm', 'analytics']

  -- Trigger
  trigger_event TEXT NOT NULL CHECK (trigger_event IN ('new_signup', 'subscription_upgrade', 'subscription_downgrade', 'inactivity_7d', 'inactivity_30d', 'usage_limit_80', 'usage_limit_100', 'trial_ending', 'payment_failed', 'custom')),
  trigger_conditions JSONB DEFAULT '{}'::JSONB,

  -- Action
  action_type TEXT NOT NULL DEFAULT 'sequence' CHECK (action_type IN ('sequence', 'single_email', 'notification', 'webhook')),
  sequence_id UUID REFERENCES email_sequences(id) ON DELETE SET NULL,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  webhook_url TEXT,

  -- Settings
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 100, -- Higher = runs first

  -- Rate limiting
  cooldown_hours INTEGER DEFAULT 24, -- Don't re-trigger for same contact within this time

  -- Stats
  times_triggered INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMP,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outreach_rules_org_id ON outreach_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_outreach_rules_active ON outreach_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_outreach_rules_trigger ON outreach_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_outreach_rules_priority ON outreach_rules(priority DESC);

-- ============================================================================
-- EMAIL UNSUBSCRIBES TABLE
-- Track unsubscribed emails to prevent sending
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Email
  email TEXT NOT NULL,

  -- Unsubscribe type
  unsubscribe_type TEXT NOT NULL DEFAULT 'all' CHECK (unsubscribe_type IN ('all', 'marketing', 'sequence')),

  -- Source
  source TEXT, -- e.g., "email_link", "preference_center", "admin", "bounce"
  source_campaign_id UUID REFERENCES email_campaigns(id),
  source_sequence_id UUID REFERENCES email_sequences(id),

  -- Timestamps
  unsubscribed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resubscribed_at TIMESTAMP,

  -- Unique per org per email per type
  UNIQUE(organization_id, email, unsubscribe_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_org_email ON email_unsubscribes(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email ON email_unsubscribes(email);

-- ============================================================================
-- UPDATE client_usage_metrics TABLE
-- Add email tracking columns
-- ============================================================================

ALTER TABLE client_usage_metrics
ADD COLUMN IF NOT EXISTS emails_sent_monthly INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS emails_limit INTEGER DEFAULT 1000;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_sequences_updated_at BEFORE UPDATE ON email_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sequence_steps_updated_at BEFORE UPDATE ON email_sequence_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outreach_rules_updated_at BEFORE UPDATE ON outreach_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES (Row Level Security)
-- ============================================================================

-- Enable RLS on all email tables
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their organization's data
-- (These mirror the pattern from existing tables)

-- Email Templates policies
CREATE POLICY "Users can view own org templates" ON email_templates
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create templates for own org" ON email_templates
  FOR INSERT WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own org templates" ON email_templates
  FOR UPDATE USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete own org templates" ON email_templates
  FOR DELETE USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- Email Campaigns policies
CREATE POLICY "Users can view own org campaigns" ON email_campaigns
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create campaigns for own org" ON email_campaigns
  FOR INSERT WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own org campaigns" ON email_campaigns
  FOR UPDATE USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete own org campaigns" ON email_campaigns
  FOR DELETE USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- Email Sequences policies
CREATE POLICY "Users can view own org sequences" ON email_sequences
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create sequences for own org" ON email_sequences
  FOR INSERT WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own org sequences" ON email_sequences
  FOR UPDATE USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete own org sequences" ON email_sequences
  FOR DELETE USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- Email Sequence Steps policies (access via sequence)
CREATE POLICY "Users can view steps of own sequences" ON email_sequence_steps
  FOR SELECT USING (sequence_id IN (
    SELECT id FROM email_sequences WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage steps of own sequences" ON email_sequence_steps
  FOR ALL USING (sequence_id IN (
    SELECT id FROM email_sequences WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

-- Email Sends policies
CREATE POLICY "Users can view own org sends" ON email_sends
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- Sequence Enrollments policies
CREATE POLICY "Users can view own org enrollments" ON sequence_enrollments
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- Outreach Rules policies
CREATE POLICY "Users can view own org rules" ON outreach_rules
  FOR SELECT USING (
    organization_id IS NULL OR  -- Global rules visible to all
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own org rules" ON outreach_rules
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- Unsubscribes policies
CREATE POLICY "Users can view own org unsubscribes" ON email_unsubscribes
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage own org unsubscribes" ON email_unsubscribes
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- ============================================================================
-- SERVICE ROLE ACCESS (for API routes and N8N)
-- ============================================================================

-- Allow service role to bypass RLS for all email tables
-- This is necessary for:
-- 1. API routes that send emails on behalf of organizations
-- 2. N8N workflows that process sequences
-- 3. Webhook handlers that update email status

CREATE POLICY "Service role full access templates" ON email_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access campaigns" ON email_campaigns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access sequences" ON email_sequences
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access steps" ON email_sequence_steps
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access sends" ON email_sends
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access enrollments" ON sequence_enrollments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access rules" ON outreach_rules
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access unsubscribes" ON email_unsubscribes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these after migration to verify success
-- ============================================================================

-- Check all email tables exist:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name LIKE 'email_%' OR table_name LIKE 'sequence_%' OR table_name = 'outreach_rules'
-- ORDER BY table_name;

-- Expected tables:
-- 1. email_campaigns
-- 2. email_sends
-- 3. email_sequence_steps
-- 4. email_sequences
-- 5. email_templates
-- 6. email_unsubscribes
-- 7. outreach_rules
-- 8. sequence_enrollments

-- ============================================================================
-- END OF EMAIL AUTOMATION MIGRATION
-- ============================================================================
