-- Elijah Module: Fire Management Tables
-- PostGIS point and polygon types for all geographic data

-- Water points (dams, hydrants, tanks, boreholes, pools, rivers)
CREATE TABLE elijah_fire_water_point (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  location geography(Point, 4326) NOT NULL,
  type elijah_water_point_type NOT NULL,
  capacity_litres integer,
  status elijah_water_point_status NOT NULL DEFAULT 'unknown',
  access_notes text,
  last_inspected timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Farms / plots with emergency access info
CREATE TABLE elijah_fire_farm (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  owner_name text NOT NULL,
  owner_phone text,
  location geography(Point, 4326) NOT NULL,
  boundary geography(Polygon, 4326),
  access_gate_location geography(Point, 4326),
  access_code text, -- SENSITIVE: gated to admin/dispatcher/fire_coordinator
  access_notes text, -- e.g. "electric fence off at mains box, dogs in yard"
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Fire responder groups
CREATE TABLE elijah_fire_responder_group (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type elijah_fire_group_type NOT NULL,
  contact_phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Responder group members
CREATE TABLE elijah_fire_responder_group_member (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES elijah_fire_responder_group(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES elijah_member(id) ON DELETE CASCADE,
  role elijah_fire_group_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT elijah_fire_group_member_unique UNIQUE (group_id, member_id)
);

-- Fire-specific incident data (extends elijah_incident where type='fire')
CREATE TABLE elijah_fire_incident (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES elijah_incident(id) ON DELETE CASCADE UNIQUE,
  fire_type elijah_fire_type NOT NULL DEFAULT 'veld',
  wind_direction text,
  wind_speed_kmh numeric,
  area_affected_ha numeric,
  nearest_water_point_id uuid REFERENCES elijah_fire_water_point(id) ON DELETE SET NULL,
  farm_id uuid REFERENCES elijah_fire_farm(id) ON DELETE SET NULL,
  status elijah_fire_status NOT NULL DEFAULT 'reported',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Water usage tracking during fire response
CREATE TABLE elijah_fire_incident_water_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fire_incident_id uuid NOT NULL REFERENCES elijah_fire_incident(id) ON DELETE CASCADE,
  water_point_id uuid NOT NULL REFERENCES elijah_fire_water_point(id) ON DELETE CASCADE,
  litres_used integer NOT NULL,
  reload_time_min integer,
  notes text,
  logged_by uuid NOT NULL REFERENCES elijah_member(id) ON DELETE SET NULL,
  logged_at timestamptz NOT NULL DEFAULT now()
);

-- Group dispatch tracking
CREATE TABLE elijah_fire_incident_group_dispatch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fire_incident_id uuid NOT NULL REFERENCES elijah_fire_incident(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES elijah_fire_responder_group(id) ON DELETE CASCADE,
  dispatched_by uuid NOT NULL REFERENCES elijah_member(id) ON DELETE SET NULL,
  dispatched_at timestamptz NOT NULL DEFAULT now(),
  arrived_at timestamptz,
  stood_down_at timestamptz,
  notes text,
  CONSTRAINT elijah_fire_dispatch_unique UNIQUE (fire_incident_id, group_id)
);

-- Fire equipment register
CREATE TABLE elijah_fire_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type elijah_fire_equipment_type NOT NULL,
  location_description text,
  assigned_group_id uuid REFERENCES elijah_fire_responder_group(id) ON DELETE SET NULL,
  status elijah_fire_equipment_status NOT NULL DEFAULT 'available',
  last_serviced timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Equipment deployment to specific fire incidents (enhancement over spec)
CREATE TABLE elijah_fire_incident_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fire_incident_id uuid NOT NULL REFERENCES elijah_fire_incident(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES elijah_fire_equipment(id) ON DELETE CASCADE,
  deployed_at timestamptz NOT NULL DEFAULT now(),
  returned_at timestamptz,
  notes text,
  CONSTRAINT elijah_fire_equipment_deploy_unique UNIQUE (fire_incident_id, equipment_id)
);

-- Spatial indexes (GIST for PostGIS)
CREATE INDEX idx_elijah_fire_water_point_location ON elijah_fire_water_point USING GIST (location);
CREATE INDEX idx_elijah_fire_water_point_org ON elijah_fire_water_point(organization_id);
CREATE INDEX idx_elijah_fire_farm_location ON elijah_fire_farm USING GIST (location);
CREATE INDEX idx_elijah_fire_farm_boundary ON elijah_fire_farm USING GIST (boundary);
CREATE INDEX idx_elijah_fire_farm_org ON elijah_fire_farm(organization_id);
CREATE INDEX idx_elijah_fire_responder_group_org ON elijah_fire_responder_group(organization_id);
CREATE INDEX idx_elijah_fire_incident_incident ON elijah_fire_incident(incident_id);
CREATE INDEX idx_elijah_fire_incident_status ON elijah_fire_incident(status);
CREATE INDEX idx_elijah_fire_equipment_org ON elijah_fire_equipment(organization_id);
CREATE INDEX idx_elijah_fire_equipment_status ON elijah_fire_equipment(status);
CREATE INDEX idx_elijah_fire_dispatch_fire ON elijah_fire_incident_group_dispatch(fire_incident_id);
CREATE INDEX idx_elijah_fire_water_usage_fire ON elijah_fire_incident_water_usage(fire_incident_id);
