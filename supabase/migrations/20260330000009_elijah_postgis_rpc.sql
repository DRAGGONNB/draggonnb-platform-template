-- Elijah Module: PostGIS RPC Functions

-- Find nearest water points to a given location
-- Used by fire incident creation and WATER STATUS WhatsApp command
CREATE OR REPLACE FUNCTION elijah_nearest_water_points(
  org_id uuid,
  lat double precision,
  lng double precision,
  max_results integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  name text,
  type elijah_water_point_type,
  capacity_litres integer,
  status elijah_water_point_status,
  access_notes text,
  last_inspected timestamptz,
  distance_meters double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    wp.id,
    wp.name,
    wp.type,
    wp.capacity_litres,
    wp.status,
    wp.access_notes,
    wp.last_inspected,
    ST_Distance(
      wp.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distance_meters
  FROM elijah_fire_water_point wp
  WHERE wp.organization_id = org_id
    AND wp.status != 'empty'
  ORDER BY wp.location <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  LIMIT max_results;
$$;

-- Check if a point falls within any registered farm boundary
-- Used when auto-linking fire incidents to farms
CREATE OR REPLACE FUNCTION elijah_find_farm_at_location(
  org_id uuid,
  lat double precision,
  lng double precision
)
RETURNS TABLE (
  id uuid,
  name text,
  owner_name text,
  owner_phone text,
  access_gate_location geography
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    f.id,
    f.name,
    f.owner_name,
    f.owner_phone,
    f.access_gate_location
  FROM elijah_fire_farm f
  WHERE f.organization_id = org_id
    AND f.boundary IS NOT NULL
    AND ST_Contains(
      f.boundary::geometry,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)
    )
  LIMIT 1;
$$;

-- Find nearest farm to a location (fallback when no boundary match)
CREATE OR REPLACE FUNCTION elijah_nearest_farm(
  org_id uuid,
  lat double precision,
  lng double precision,
  max_distance_meters double precision DEFAULT 5000
)
RETURNS TABLE (
  id uuid,
  name text,
  owner_name text,
  owner_phone text,
  distance_meters double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    f.id,
    f.name,
    f.owner_name,
    f.owner_phone,
    ST_Distance(
      f.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distance_meters
  FROM elijah_fire_farm f
  WHERE f.organization_id = org_id
    AND ST_DWithin(
      f.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      max_distance_meters
    )
  ORDER BY distance_meters
  LIMIT 1;
$$;
