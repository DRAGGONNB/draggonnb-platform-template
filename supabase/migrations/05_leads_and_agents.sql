-- DraggonnB CRMM - Leads, Agents & Provisioning Migration
-- Created: 2026-02-06
-- Purpose: Add leads qualification pipeline, AI agent sessions, provisioning jobs,
--          and solution templates for the self-service onboarding flow
--
-- INSTRUCTIONS:
-- 1. Login to Supabase Dashboard: https://supabase.com/dashboard/project/psqfgzbjbgqrmjskdavs
-- 2. Navigate to: SQL Editor
-- 3. Copy this entire file contents
-- 4. Paste into SQL Editor
-- 5. Click "Run" to execute

-- ============================================================================
-- ALTER EXISTING TABLES
-- Update organizations CHECK constraints and add new usage columns
-- ============================================================================

-- Expand subscription_tier to include new tier names (core, growth, scale)
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subscription_tier_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_subscription_tier_check
  CHECK (subscription_tier IN ('starter', 'professional', 'enterprise', 'core', 'growth', 'scale'));

-- Expand subscription_status to include payment states
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subscription_status_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_subscription_status_check
  CHECK (subscription_status IN ('trial', 'active', 'suspended', 'cancelled', 'payment_failed', 'payment_pending'));

-- Add new usage tracking columns to client_usage_metrics
ALTER TABLE client_usage_metrics ADD COLUMN IF NOT EXISTS emails_sent_monthly INTEGER NOT NULL DEFAULT 0;
ALTER TABLE client_usage_metrics ADD COLUMN IF NOT EXISTS agent_invocations_monthly INTEGER NOT NULL DEFAULT 0;

-- ============================================================================
-- TABLE 1: LEADS
-- ============================================================================
-- Inbound leads from the qualification form and other sources

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact info
  email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  website TEXT,

  -- Business details
  industry TEXT,
  company_size TEXT,
  source TEXT NOT NULL DEFAULT 'qualify_form',
  business_issues JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Qualification pipeline
  qualification_status TEXT NOT NULL DEFAULT 'pending' CHECK (qualification_status IN ('pending', 'qualifying', 'qualified', 'disqualified', 'approved', 'converted')),
  qualification_score JSONB,
  recommended_tier TEXT,
  solution_blueprint JSONB,

  -- Conversion tracking
  converted_at TIMESTAMP,
  converted_organization_id UUID REFERENCES organizations(id),

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for leads
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_qualification_status ON leads(qualification_status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- ============================================================================
-- TABLE 2: PROVISIONING_JOBS
-- ============================================================================
-- Tracks multi-step tenant provisioning (org setup, n8n workflows, emails, etc.)

CREATE TABLE IF NOT EXISTS provisioning_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id),

  -- Job details
  tier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rolled_back')),
  current_step TEXT,

  -- Progress tracking
  steps_completed JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_resources JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for provisioning_jobs
CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_organization_id ON provisioning_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_lead_id ON provisioning_jobs(lead_id);
CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_status ON provisioning_jobs(status);
CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_created_at ON provisioning_jobs(created_at DESC);

-- ============================================================================
-- TABLE 3: AGENT_SESSIONS
-- ============================================================================
-- AI agent conversation sessions (qualification agent, support agent, etc.)

CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Session details
  agent_type TEXT NOT NULL,
  lead_id UUID REFERENCES leads(id),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  tokens_used INTEGER NOT NULL DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  result JSONB,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for agent_sessions
CREATE INDEX IF NOT EXISTS idx_agent_sessions_organization_id ON agent_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent_type ON agent_sessions(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_lead_id ON agent_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);

-- ============================================================================
-- TABLE 4: SOLUTION_TEMPLATES
-- ============================================================================
-- Pre-built automation templates that can be provisioned for clients

CREATE TABLE IF NOT EXISTS solution_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template info
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  industry TEXT[] NOT NULL DEFAULT '{}',

  -- Access control
  tier_minimum TEXT NOT NULL DEFAULT 'core',

  -- Template payloads
  n8n_workflow_json JSONB,
  email_templates JSONB,
  config_schema JSONB,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for solution_templates
CREATE INDEX IF NOT EXISTS idx_solution_templates_category ON solution_templates(category);
CREATE INDEX IF NOT EXISTS idx_solution_templates_tier_minimum ON solution_templates(tier_minimum);
CREATE INDEX IF NOT EXISTS idx_solution_templates_is_active ON solution_templates(is_active);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provisioning_jobs_updated_at BEFORE UPDATE ON provisioning_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_sessions_updated_at BEFORE UPDATE ON agent_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_solution_templates_updated_at BEFORE UPDATE ON solution_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE provisioning_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE solution_templates ENABLE ROW LEVEL SECURITY;

-- Leads: Admin-only table, accessed exclusively via service role
CREATE POLICY "Service role has full access to leads" ON leads
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Provisioning jobs: Admin-only table, accessed exclusively via service role
CREATE POLICY "Service role has full access to provisioning_jobs" ON provisioning_jobs
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Agent sessions: Users can read sessions belonging to their organization
CREATE POLICY "Users can view agent sessions in their organization" ON agent_sessions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Agent sessions: Service role has full access (for agent backend)
CREATE POLICY "Service role has full access to agent_sessions" ON agent_sessions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Solution templates: All authenticated users can read (public catalog)
CREATE POLICY "Authenticated users can view active solution templates" ON solution_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Solution templates: Service role has full access (for admin management)
CREATE POLICY "Service role has full access to solution_templates" ON solution_templates
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- SEED DATA: SOLUTION TEMPLATES
-- ============================================================================

INSERT INTO solution_templates (name, description, category, industry, tier_minimum) VALUES
  (
    'Invoice Follow-Up Reminder',
    'Automatically sends polite payment reminder emails when invoices are overdue. Escalates through a 3-step sequence (friendly reminder, firm follow-up, final notice) based on days past due.',
    'billing',
    '{}',
    'core'
  ),
  (
    'Lead Response Auto-Reply',
    'Instantly replies to new lead enquiries with a personalised acknowledgement email. Captures the lead source, assigns a priority score, and notifies the sales team via webhook.',
    'sales',
    '{}',
    'core'
  ),
  (
    'Appointment Booking Confirmation',
    'Sends branded booking confirmation and calendar invite when a new appointment is scheduled. Includes automated reminders at 24 hours and 1 hour before the meeting.',
    'scheduling',
    '{}',
    'core'
  ),
  (
    'Social Content Calendar',
    'Generates a weekly social media content calendar with AI-drafted posts for LinkedIn, Facebook, and Instagram. Includes suggested hashtags and optimal posting times for the South African market.',
    'marketing',
    '{"retail","ecommerce","professional_services"}',
    'growth'
  ),
  (
    'Customer Feedback Collection',
    'Triggers a satisfaction survey after key touchpoints (purchase, support ticket closure, onboarding completion). Aggregates NPS scores and routes negative feedback for immediate follow-up.',
    'engagement',
    '{"retail","hospitality","saas"}',
    'growth'
  ),
  (
    'Weekly Report Generation',
    'Compiles weekly performance metrics across CRM, social media, and email channels into a branded PDF report. Auto-delivers to team leads every Monday morning.',
    'analytics',
    '{}',
    'growth'
  ),
  (
    'New Customer Onboarding Drip',
    'Delivers a 5-email onboarding sequence to new customers over their first 14 days. Covers welcome, setup guide, tips and tricks, feature highlights, and a check-in request.',
    'onboarding',
    '{}',
    'core'
  ),
  (
    'Re-Engagement Campaign',
    'Identifies contacts who have not interacted in 30+ days and enrols them in a targeted re-engagement email sequence. Includes a special offer template and win-back messaging.',
    'marketing',
    '{"retail","ecommerce","hospitality"}',
    'growth'
  );

-- ============================================================================
-- RPC FUNCTION: ATOMIC USAGE INCREMENT
-- ============================================================================
-- Used by lib/tier/feature-gate.ts for atomic usage metric updates

CREATE OR REPLACE FUNCTION increment_usage_metric(
  p_organization_id UUID,
  p_column_name TEXT,
  p_amount INTEGER DEFAULT 1
) RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE client_usage_metrics SET %I = COALESCE(%I, 0) + $1 WHERE organization_id = $2',
    p_column_name, p_column_name
  ) USING p_amount, p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('leads', 'provisioning_jobs', 'agent_sessions', 'solution_templates')
ORDER BY table_name;
-- Expected: agent_sessions, leads, provisioning_jobs, solution_templates

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('leads', 'provisioning_jobs', 'agent_sessions', 'solution_templates');
-- All should show rowsecurity = true

-- Verify updated organizations constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'organizations'::regclass
AND conname LIKE 'organizations_subscription_%';
-- Should show expanded tier and status values

-- Verify solution_templates seed data
SELECT name, category, tier_minimum FROM solution_templates ORDER BY category, name;
-- Expected: 8 rows

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
