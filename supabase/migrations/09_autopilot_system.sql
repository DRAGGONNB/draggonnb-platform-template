-- DraggonnB CRMM - Business Autopilot System Migration
-- Created: 2026-02-25
-- Purpose: Client profiles, content_queue enhancements, autopilot usage tracking
--
-- INSTRUCTIONS:
-- 1. Login to Supabase Dashboard
-- 2. Navigate to: SQL Editor
-- 3. Copy this entire file contents
-- 4. Paste into SQL Editor
-- 5. Click "Run" to execute

-- ============================================================================
-- TABLE: CLIENT_PROFILES
-- ============================================================================
-- Rich client context for the Business Autopilot agent

CREATE TABLE IF NOT EXISTS client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,

  -- Business identity
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  sub_industry TEXT,
  business_description TEXT,
  target_market TEXT NOT NULL,
  company_size TEXT,
  location TEXT,
  website TEXT,

  -- Brand voice
  tone TEXT NOT NULL DEFAULT 'professional',
  brand_values TEXT[] DEFAULT '{}',
  brand_do TEXT[] DEFAULT '{}',
  brand_dont TEXT[] DEFAULT '{}',
  tagline TEXT,

  -- Content strategy
  seo_keywords TEXT[] DEFAULT '{}',
  content_pillars TEXT[] DEFAULT '{}',
  competitor_names TEXT[] DEFAULT '{}',
  unique_selling_points TEXT[] DEFAULT '{}',

  -- Scheduling preferences (social)
  preferred_platforms TEXT[] DEFAULT '{linkedin,facebook}',
  posting_frequency JSONB DEFAULT '{"linkedin": 3, "facebook": 2, "instagram": 2, "twitter": 1}',
  preferred_post_times JSONB DEFAULT '{"morning": "08:00", "afternoon": "12:00", "evening": "17:00"}',
  timezone TEXT DEFAULT 'Africa/Johannesburg',

  -- Email campaign preferences
  email_campaigns_per_week INTEGER DEFAULT 1,
  preferred_email_goals TEXT[] DEFAULT '{newsletter,promotion}',
  email_send_day TEXT DEFAULT 'tuesday',
  email_send_time TEXT DEFAULT '09:00',

  -- Autopilot state
  autopilot_enabled BOOLEAN DEFAULT false,
  auto_generate_day TEXT DEFAULT 'monday',
  last_calendar_generated_at TIMESTAMP,
  last_calendar_week TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_profiles_org ON client_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_autopilot ON client_profiles(autopilot_enabled) WHERE autopilot_enabled = true;

-- ============================================================================
-- CONTENT_QUEUE ENHANCEMENTS
-- ============================================================================
-- Add autopilot-specific columns to existing content_queue table

ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS calendar_week INTEGER;
ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS calendar_year INTEGER;
ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS agent_session_id UUID REFERENCES agent_sessions(id);
ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS layout_data JSONB DEFAULT '{}';

-- Allow 'email' as a platform value for autopilot email references in the calendar
ALTER TABLE content_queue DROP CONSTRAINT IF EXISTS content_queue_platform_check;
ALTER TABLE content_queue ADD CONSTRAINT content_queue_platform_check
  CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'twitter', 'email'));

CREATE INDEX IF NOT EXISTS idx_content_queue_calendar ON content_queue(organization_id, calendar_year, calendar_week);
CREATE INDEX IF NOT EXISTS idx_content_queue_source ON content_queue(source);

-- ============================================================================
-- USAGE TRACKING
-- ============================================================================
-- Add autopilot runs counter to usage metrics

ALTER TABLE client_usage_metrics ADD COLUMN IF NOT EXISTS autopilot_runs_monthly INTEGER NOT NULL DEFAULT 0;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON client_profiles
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own profile" ON client_profiles
  FOR UPDATE USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own profile" ON client_profiles
  FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Service role full access to client_profiles" ON client_profiles
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- TRIGGER
-- ============================================================================

CREATE TRIGGER update_client_profiles_updated_at BEFORE UPDATE ON client_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_profiles') THEN
    RAISE NOTICE 'client_profiles table created successfully';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_queue' AND column_name = 'source'
  ) THEN
    RAISE NOTICE 'content_queue autopilot columns added successfully';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_usage_metrics' AND column_name = 'autopilot_runs_monthly'
  ) THEN
    RAISE NOTICE 'autopilot_runs_monthly column added to client_usage_metrics';
  END IF;
END $$;
