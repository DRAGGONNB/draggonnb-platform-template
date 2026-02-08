-- DraggonnB CRMM - CRM Tables Migration
-- Created: 2026-01-29
-- Purpose: Add CRM tables (contacts, companies, deals) that are referenced by API routes
--
-- INSTRUCTIONS:
-- 1. Login to Supabase Dashboard: https://supabase.com/dashboard/project/psqfgzbjbgqrmjskdavs
-- 2. Navigate to: SQL Editor
-- 3. Copy this entire file contents
-- 4. Paste into SQL Editor
-- 5. Click "Run" to execute

-- ============================================================================
-- TABLE 1: COMPANIES
-- ============================================================================
-- Company records for CRM - must be created BEFORE contacts (for FK reference)

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Company info
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  phone TEXT,

  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'South Africa',
  postal_code TEXT,

  -- Business details
  employee_count INTEGER,
  annual_revenue DECIMAL(15, 2),

  -- Additional info
  description TEXT,
  notes TEXT,
  tags TEXT[],

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for companies
CREATE INDEX IF NOT EXISTS idx_companies_organization_id ON companies(organization_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);

-- ============================================================================
-- TABLE 2: CONTACTS
-- ============================================================================
-- CRM contact records

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Contact info
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,

  -- Company link
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  company TEXT, -- Denormalized for quick display
  job_title TEXT,

  -- Status and lifecycle
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'prospect', 'active', 'customer', 'inactive', 'churned')),
  lead_source TEXT,

  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'South Africa',
  postal_code TEXT,

  -- Additional info
  notes TEXT,
  tags TEXT[],

  -- Social profiles
  linkedin_url TEXT,
  twitter_handle TEXT,

  -- Email preferences
  email_opted_in BOOLEAN DEFAULT true,
  last_contacted_at TIMESTAMP,

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);

-- ============================================================================
-- TABLE 3: DEALS
-- ============================================================================
-- Sales pipeline deals

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Deal info
  name TEXT NOT NULL,
  description TEXT,

  -- Value
  value DECIMAL(15, 2) DEFAULT 0,
  currency TEXT DEFAULT 'ZAR',

  -- Pipeline stage
  stage TEXT NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  probability INTEGER DEFAULT 10 CHECK (probability >= 0 AND probability <= 100),

  -- Related entities
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

  -- Dates
  expected_close_date DATE,
  actual_close_date DATE,

  -- Lost deal tracking
  lost_reason TEXT,
  competitor TEXT,

  -- Additional info
  notes TEXT,
  tags TEXT[],

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for deals
CREATE INDEX IF NOT EXISTS idx_deals_organization_id ON deals(organization_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close_date ON deals(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);

-- ============================================================================
-- TABLE 4: CONTENT_QUEUE
-- ============================================================================
-- Queue for social media content pending approval/publishing

CREATE TABLE IF NOT EXISTS content_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'twitter')),

  -- Media
  image_url TEXT,
  video_url TEXT,

  -- Hashtags and mentions
  hashtags TEXT[],
  mentions TEXT[],

  -- Status workflow
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'scheduled', 'published', 'rejected', 'failed')),
  rejection_reason TEXT,

  -- Scheduling
  publish_at TIMESTAMP,
  published_at TIMESTAMP,

  -- Platform response after publishing
  platform_post_id TEXT,
  platform_response JSONB,

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for content_queue
CREATE INDEX IF NOT EXISTS idx_content_queue_organization_id ON content_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_content_queue_status ON content_queue(status);
CREATE INDEX IF NOT EXISTS idx_content_queue_platform ON content_queue(platform);
CREATE INDEX IF NOT EXISTS idx_content_queue_publish_at ON content_queue(publish_at);
CREATE INDEX IF NOT EXISTS idx_content_queue_created_at ON content_queue(created_at DESC);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_queue_updated_at BEFORE UPDATE ON content_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all CRM tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_queue ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Users can view companies in their organization" ON companies
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert companies in their organization" ON companies
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update companies in their organization" ON companies
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete companies in their organization" ON companies
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Service role bypass for companies
CREATE POLICY "Service role has full access to companies" ON companies
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Contacts policies
CREATE POLICY "Users can view contacts in their organization" ON contacts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert contacts in their organization" ON contacts
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update contacts in their organization" ON contacts
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete contacts in their organization" ON contacts
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Service role bypass for contacts
CREATE POLICY "Service role has full access to contacts" ON contacts
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Deals policies
CREATE POLICY "Users can view deals in their organization" ON deals
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert deals in their organization" ON deals
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update deals in their organization" ON deals
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete deals in their organization" ON deals
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Service role bypass for deals
CREATE POLICY "Service role has full access to deals" ON deals
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Content queue policies
CREATE POLICY "Users can view content_queue in their organization" ON content_queue
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert content_queue in their organization" ON content_queue
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update content_queue in their organization" ON content_queue
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete content_queue in their organization" ON content_queue
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Service role bypass for content_queue
CREATE POLICY "Service role has full access to content_queue" ON content_queue
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check CRM tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('companies', 'contacts', 'deals', 'content_queue')
ORDER BY table_name;
-- Expected: companies, contacts, content_queue, deals

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('companies', 'contacts', 'deals', 'content_queue');
-- All should show rowsecurity = true

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
