-- ============================================================================
-- Migration: Accommodation Module Tables
-- Phase 3: First vertical module — Properties, Units, Inquiries, Guests
-- ============================================================================

-- accommodation_properties
CREATE TABLE IF NOT EXISTS accommodation_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hotel', 'guesthouse', 'bnb', 'lodge', 'apartment', 'villa', 'resort', 'other')),
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'South Africa',
  amenities TEXT[] DEFAULT '{}',
  check_in_time TEXT DEFAULT '14:00',
  check_out_time TEXT DEFAULT '10:00',
  description TEXT,
  booking_com_id TEXT,
  airbnb_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- accommodation_units
CREATE TABLE IF NOT EXISTS accommodation_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES accommodation_properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('room', 'suite', 'apartment', 'cottage', 'tent', 'dorm', 'other')),
  max_guests INTEGER NOT NULL DEFAULT 2,
  base_price_per_night DECIMAL(10,2) NOT NULL DEFAULT 0,
  amenities TEXT[] DEFAULT '{}',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- accommodation_guests
CREATE TABLE IF NOT EXISTS accommodation_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  id_number TEXT,
  nationality TEXT,
  preferences JSONB DEFAULT '{}',
  total_stays INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  vip_status BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, email)
);

-- accommodation_inquiries
CREATE TABLE IF NOT EXISTS accommodation_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES accommodation_properties(id),
  unit_id UUID REFERENCES accommodation_units(id),
  guest_id UUID REFERENCES accommodation_guests(id),
  stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'quoted', 'confirmed', 'checked_in', 'checked_out', 'closed', 'cancelled')),
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  check_in_date DATE,
  check_out_date DATE,
  guests_count INTEGER DEFAULT 1,
  quoted_price DECIMAL(10,2),
  source TEXT DEFAULT 'direct' CHECK (source IN ('direct', 'booking_com', 'airbnb', 'whatsapp', 'email', 'phone', 'website')),
  add_ons JSONB DEFAULT '{}',
  special_requests TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Same pattern as CRM tables — org-scoped access
ALTER TABLE accommodation_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodation_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodation_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodation_inquiries ENABLE ROW LEVEL SECURITY;

-- Properties
DROP POLICY IF EXISTS "Org members can select accommodation_properties" ON accommodation_properties;
DROP POLICY IF EXISTS "Org members can insert accommodation_properties" ON accommodation_properties;
DROP POLICY IF EXISTS "Org members can update accommodation_properties" ON accommodation_properties;
DROP POLICY IF EXISTS "Org members can delete accommodation_properties" ON accommodation_properties;

CREATE POLICY "Org members can select accommodation_properties" ON accommodation_properties
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Org members can insert accommodation_properties" ON accommodation_properties
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Org members can update accommodation_properties" ON accommodation_properties
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Org members can delete accommodation_properties" ON accommodation_properties
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Units
DROP POLICY IF EXISTS "Org members can select accommodation_units" ON accommodation_units;
DROP POLICY IF EXISTS "Org members can insert accommodation_units" ON accommodation_units;
DROP POLICY IF EXISTS "Org members can update accommodation_units" ON accommodation_units;
DROP POLICY IF EXISTS "Org members can delete accommodation_units" ON accommodation_units;

CREATE POLICY "Org members can select accommodation_units" ON accommodation_units
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Org members can insert accommodation_units" ON accommodation_units
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Org members can update accommodation_units" ON accommodation_units
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Org members can delete accommodation_units" ON accommodation_units
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Guests
DROP POLICY IF EXISTS "Org members can select accommodation_guests" ON accommodation_guests;
DROP POLICY IF EXISTS "Org members can insert accommodation_guests" ON accommodation_guests;
DROP POLICY IF EXISTS "Org members can update accommodation_guests" ON accommodation_guests;
DROP POLICY IF EXISTS "Org members can delete accommodation_guests" ON accommodation_guests;

CREATE POLICY "Org members can select accommodation_guests" ON accommodation_guests
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Org members can insert accommodation_guests" ON accommodation_guests
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Org members can update accommodation_guests" ON accommodation_guests
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Org members can delete accommodation_guests" ON accommodation_guests
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Inquiries
DROP POLICY IF EXISTS "Org members can select accommodation_inquiries" ON accommodation_inquiries;
DROP POLICY IF EXISTS "Org members can insert accommodation_inquiries" ON accommodation_inquiries;
DROP POLICY IF EXISTS "Org members can update accommodation_inquiries" ON accommodation_inquiries;
DROP POLICY IF EXISTS "Org members can delete accommodation_inquiries" ON accommodation_inquiries;

CREATE POLICY "Org members can select accommodation_inquiries" ON accommodation_inquiries
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Org members can insert accommodation_inquiries" ON accommodation_inquiries
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Org members can update accommodation_inquiries" ON accommodation_inquiries
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Org members can delete accommodation_inquiries" ON accommodation_inquiries
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accommodation_properties_org ON accommodation_properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_units_property ON accommodation_units(property_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_units_org ON accommodation_units(organization_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_guests_org ON accommodation_guests(organization_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_inquiries_org ON accommodation_inquiries(organization_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_inquiries_property ON accommodation_inquiries(property_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_inquiries_stage ON accommodation_inquiries(stage);
