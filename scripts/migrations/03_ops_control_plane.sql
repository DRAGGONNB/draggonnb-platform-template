-- ============================================================================
-- Migration: Ops Control Plane Tables
-- Phase 1: WhatsApp Intake + Telegram Approval + Provisioning Jobs
-- ============================================================================

-- ops_leads: WhatsApp intake tracking
CREATE TABLE IF NOT EXISTS ops_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  wa_message_id TEXT,
  conversation_state TEXT NOT NULL DEFAULT 'started' CHECK (conversation_state IN ('started', 'business_name', 'website', 'email', 'issues', 'industry', 'complete')),
  business_name TEXT,
  website TEXT,
  email TEXT,
  business_issues TEXT[] DEFAULT '{}',
  industry TEXT,
  qualification_result JSONB,
  qualification_status TEXT NOT NULL DEFAULT 'pending' CHECK (qualification_status IN ('pending', 'qualified', 'approved', 'rejected', 'provisioning', 'provisioned')),
  telegram_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- provisioning_jobs: Tracks provisioning runs
CREATE TABLE IF NOT EXISTS provisioning_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ops_lead_id UUID REFERENCES ops_leads(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rolled_back')),
  current_step TEXT,
  steps_completed TEXT[] DEFAULT '{}',
  created_resources JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ops_activity_log: Event log for ops actions
CREATE TABLE IF NOT EXISTS ops_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  ops_lead_id UUID REFERENCES ops_leads(id),
  provisioning_job_id UUID REFERENCES provisioning_jobs(id),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: service_role only (no user-facing access)
ALTER TABLE ops_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE provisioning_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_activity_log ENABLE ROW LEVEL SECURITY;
-- No policies = only service_role can access

CREATE INDEX IF NOT EXISTS idx_ops_leads_phone ON ops_leads(phone_number);
CREATE INDEX IF NOT EXISTS idx_ops_leads_status ON ops_leads(qualification_status);
CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_lead ON provisioning_jobs(ops_lead_id);
CREATE INDEX IF NOT EXISTS idx_ops_activity_log_lead ON ops_activity_log(ops_lead_id);
