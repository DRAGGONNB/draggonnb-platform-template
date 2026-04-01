-- Elijah Module: Enum Types
-- Community Safety, Response & Fire Management

-- Core enums
CREATE TYPE elijah_role_type AS ENUM ('admin', 'dispatcher', 'patroller', 'household_contact', 'member', 'fire_coordinator');
CREATE TYPE elijah_incident_type AS ENUM ('break_in', 'fire', 'medical', 'suspicious_activity', 'noise', 'infrastructure', 'other');
CREATE TYPE elijah_severity AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE elijah_incident_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE elijah_checkin_status AS ENUM ('pending', 'safe', 'help', 'away', 'missed');
CREATE TYPE elijah_patrol_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');
CREATE TYPE elijah_checkin_type AS ENUM ('in', 'out');

-- Fire management enums
CREATE TYPE elijah_water_point_type AS ENUM ('dam', 'hydrant', 'tank', 'borehole', 'pool', 'river');
CREATE TYPE elijah_water_point_status AS ENUM ('operational', 'low', 'empty', 'maintenance', 'unknown');
CREATE TYPE elijah_fire_type AS ENUM ('veld', 'structural', 'vehicle', 'electrical', 'other');
CREATE TYPE elijah_fire_status AS ENUM ('reported', 'active', 'contained', 'extinguished', 'monitoring');
CREATE TYPE elijah_fire_group_type AS ENUM ('community_team', 'volunteer_brigade', 'municipal_fd', 'private_contractor');
CREATE TYPE elijah_fire_group_role AS ENUM ('leader', 'driver', 'member');
CREATE TYPE elijah_fire_equipment_type AS ENUM ('tanker', 'bakkie_skid', 'pump', 'trailer', 'beaters', 'hose_reel', 'extinguisher');
CREATE TYPE elijah_fire_equipment_status AS ENUM ('available', 'deployed', 'maintenance', 'decommissioned');
