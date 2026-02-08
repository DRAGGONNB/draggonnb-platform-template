-- Migration: Social Media Accounts
-- Purpose: Store OAuth tokens and metadata for connected social media accounts
-- Platforms: Facebook, Instagram, LinkedIn, Twitter

CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Platform identification
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'twitter')),
  platform_user_id TEXT NOT NULL,
  platform_username TEXT,
  platform_display_name TEXT,
  profile_image_url TEXT,

  -- OAuth tokens (encrypted at rest by Supabase)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,

  -- For Facebook/Instagram: page_id is required for publishing
  page_id TEXT,
  page_name TEXT,
  page_access_token TEXT,

  -- Connection metadata
  scopes TEXT[],
  connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  error_message TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Ensure one account per platform per org (can have multiple pages though)
  UNIQUE(organization_id, platform, platform_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_accounts_organization_id ON social_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_accounts_status ON social_accounts(status);

-- Trigger for updated_at
CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON social_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies (matching pattern from rls-policies.sql)
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
