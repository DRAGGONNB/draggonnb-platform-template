-- Elijah Module: RPC Functions for n8n Workflow Integration
-- These functions are called via Supabase REST API from n8n httpRequest nodes
-- using $env.SUPABASE_URL and $env.SUPABASE_SERVICE_KEY

-- Get active roll call schedules that should fire now
CREATE OR REPLACE FUNCTION elijah_get_active_schedules()
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  name text,
  frequency text,
  send_time time,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT s.id, s.organization_id, s.name, s.frequency::text, s.send_time, s.is_active
  FROM elijah_rollcall_schedule s
  WHERE s.is_active = true;
$$;

-- Get all households in a section with member phone numbers
CREATE OR REPLACE FUNCTION elijah_get_section_households(p_org_id uuid)
RETURNS TABLE (
  household_id uuid,
  household_name text,
  section_id uuid,
  section_name text,
  member_id uuid,
  member_name text,
  member_phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    h.id AS household_id,
    h.name AS household_name,
    s.id AS section_id,
    s.name AS section_name,
    m.id AS member_id,
    m.display_name AS member_name,
    m.phone AS member_phone
  FROM elijah_household h
  JOIN elijah_section s ON s.id = h.section_id
  JOIN elijah_member m ON m.household_id = h.id
  WHERE h.organization_id = p_org_id
    AND m.phone IS NOT NULL
  ORDER BY s.name, h.name;
$$;

-- Get buddy household contact for escalation tier 2
CREATE OR REPLACE FUNCTION elijah_get_buddy_contact(p_household_id uuid)
RETURNS TABLE (
  buddy_household_id uuid,
  buddy_household_name text,
  member_id uuid,
  member_name text,
  member_phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    bh.id AS buddy_household_id,
    bh.name AS buddy_household_name,
    m.id AS member_id,
    m.display_name AS member_name,
    m.phone AS member_phone
  FROM elijah_household_buddy hb
  JOIN elijah_household bh ON bh.id = hb.buddy_household_id
  JOIN elijah_member m ON m.household_id = bh.id
  WHERE hb.household_id = p_household_id
    AND m.phone IS NOT NULL
  LIMIT 1;
$$;

-- Get dispatchers for an organization
CREATE OR REPLACE FUNCTION elijah_get_org_dispatchers(p_org_id uuid)
RETURNS TABLE (
  member_id uuid,
  member_name text,
  member_phone text,
  role text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    m.id AS member_id,
    m.display_name AS member_name,
    m.phone AS member_phone,
    mr.role::text
  FROM elijah_member m
  JOIN elijah_member_role mr ON mr.member_id = m.id
  WHERE m.organization_id = p_org_id
    AND mr.role IN ('dispatcher', 'admin')
    AND m.phone IS NOT NULL
  ORDER BY mr.role;
$$;

-- Get pending checkins for escalation checks
CREATE OR REPLACE FUNCTION elijah_get_pending_checkins(p_schedule_id uuid, p_date date)
RETURNS TABLE (
  checkin_id uuid,
  household_id uuid,
  household_name text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    c.id AS checkin_id,
    c.household_id,
    h.name AS household_name,
    c.status::text,
    c.created_at
  FROM elijah_rollcall_checkin c
  JOIN elijah_household h ON h.id = c.household_id
  WHERE c.schedule_id = p_schedule_id
    AND c.created_at::date = p_date
    AND c.status = 'pending';
$$;

-- Get checkin status for a specific household
CREATE OR REPLACE FUNCTION elijah_get_checkin_status(p_household_id uuid, p_date date)
RETURNS TABLE (
  checkin_id uuid,
  status text,
  checked_in_by uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    c.id AS checkin_id,
    c.status::text,
    c.checked_in_by,
    c.created_at
  FROM elijah_rollcall_checkin c
  WHERE c.household_id = p_household_id
    AND c.created_at::date = p_date
  ORDER BY c.created_at DESC
  LIMIT 1;
$$;

-- Create a welfare incident from escalation engine
CREATE OR REPLACE FUNCTION elijah_create_welfare_incident(
  p_org_id uuid,
  p_household_name text,
  p_reported_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_incident_id uuid;
BEGIN
  INSERT INTO elijah_incident (organization_id, type, severity, status, description, reported_by)
  VALUES (
    p_org_id,
    'other',
    'high',
    'open',
    'Welfare check required: ' || p_household_name || ' did not respond to roll call after full escalation.',
    p_reported_by
  )
  RETURNING id INTO v_incident_id;

  RETURN v_incident_id;
END;
$$;

-- Get fire alert data: nearest water points and farm info
CREATE OR REPLACE FUNCTION elijah_get_fire_alert_data(p_incident_id uuid)
RETURNS TABLE (
  incident_id uuid,
  organization_id uuid,
  description text,
  severity text,
  fire_type text,
  wind_direction text,
  reported_by_name text,
  reported_by_phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    i.id AS incident_id,
    i.organization_id,
    i.description,
    i.severity::text,
    fi.fire_type::text,
    fi.wind_direction,
    m.display_name AS reported_by_name,
    m.phone AS reported_by_phone
  FROM elijah_incident i
  LEFT JOIN elijah_fire_incident fi ON fi.incident_id = i.id
  LEFT JOIN elijah_member m ON m.id = i.reported_by
  WHERE i.id = p_incident_id
    AND i.type = 'fire';
$$;

-- Get fire responder group leaders for an organization
CREATE OR REPLACE FUNCTION elijah_get_group_leaders(p_org_id uuid)
RETURNS TABLE (
  group_id uuid,
  group_name text,
  leader_id uuid,
  leader_name text,
  leader_phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    g.id AS group_id,
    g.name AS group_name,
    m.id AS leader_id,
    m.display_name AS leader_name,
    m.phone AS leader_phone
  FROM elijah_fire_responder_group g
  JOIN elijah_fire_responder_group_member gm ON gm.group_id = g.id AND gm.is_leader = true
  JOIN elijah_member m ON m.id = gm.member_id
  WHERE g.organization_id = p_org_id;
$$;
