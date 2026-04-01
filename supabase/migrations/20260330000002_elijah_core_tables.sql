-- Elijah Module: Core Tables (Members, Households, Sections)
-- All tables use organization_id for tenant isolation (maps to community_id in spec)

-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Sections (subdivisions within a community/organization)
CREATE TABLE elijah_section (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Households (physical dwelling units)
CREATE TABLE elijah_household (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  section_id uuid REFERENCES elijah_section(id) ON DELETE SET NULL,
  address text NOT NULL,
  unit_number text,
  primary_contact_id uuid, -- FK added after elijah_member exists
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Household buddy pairs (for escalation tier 2)
CREATE TABLE elijah_household_buddy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES elijah_household(id) ON DELETE CASCADE,
  buddy_household_id uuid NOT NULL REFERENCES elijah_household(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT elijah_household_buddy_unique UNIQUE (household_id, buddy_household_id),
  CONSTRAINT elijah_household_buddy_not_self CHECK (household_id != buddy_household_id)
);

-- Members (people in the system, linked to Supabase auth)
CREATE TABLE elijah_member (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  phone text,
  household_id uuid REFERENCES elijah_household(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT elijah_member_org_user_unique UNIQUE (organization_id, user_id)
);

-- Add FK from household to member for primary_contact
ALTER TABLE elijah_household
  ADD CONSTRAINT elijah_household_primary_contact_fk
  FOREIGN KEY (primary_contact_id) REFERENCES elijah_member(id) ON DELETE SET NULL;

-- Member roles
CREATE TABLE elijah_member_role (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES elijah_member(id) ON DELETE CASCADE,
  role elijah_role_type NOT NULL,
  granted_by uuid REFERENCES elijah_member(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT elijah_member_role_unique UNIQUE (member_id, role)
);

-- Sensitive member profiles (POPIA-controlled)
CREATE TABLE elijah_member_sensitive_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES elijah_member(id) ON DELETE CASCADE UNIQUE,
  medical_info text,
  emergency_contacts text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sensitive data access audit trail
CREATE TABLE elijah_sensitive_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL, -- can reference member or farm ID
  accessed_by uuid NOT NULL,
  access_type text NOT NULL,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text
);

-- Notification preferences (per-member alert filtering)
CREATE TABLE elijah_notification_preference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES elijah_member(id) ON DELETE CASCADE UNIQUE,
  incident_types elijah_incident_type[],
  min_severity elijah_severity,
  fire_alerts boolean NOT NULL DEFAULT true,
  rollcall_reminders boolean NOT NULL DEFAULT true,
  patrol_updates boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_elijah_section_org ON elijah_section(organization_id);
CREATE INDEX idx_elijah_household_org ON elijah_household(organization_id);
CREATE INDEX idx_elijah_household_section ON elijah_household(section_id);
CREATE INDEX idx_elijah_member_org ON elijah_member(organization_id);
CREATE INDEX idx_elijah_member_user ON elijah_member(user_id);
CREATE INDEX idx_elijah_member_role_member ON elijah_member_role(member_id);
CREATE INDEX idx_elijah_sensitive_audit_accessed_at ON elijah_sensitive_access_audit(accessed_at DESC);
