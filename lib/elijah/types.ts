// Elijah Module - Type Definitions
// Community Safety, Response & Fire Management

// ---- Enums ----

export type ElijahRoleType = 'admin' | 'dispatcher' | 'patroller' | 'household_contact' | 'member' | 'fire_coordinator'

export type IncidentType = 'break_in' | 'fire' | 'medical' | 'suspicious_activity' | 'noise' | 'infrastructure' | 'other'

export type Severity = 'critical' | 'high' | 'medium' | 'low'

export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export type CheckinStatus = 'pending' | 'safe' | 'help' | 'away' | 'missed'

export type PatrolStatus = 'scheduled' | 'active' | 'completed' | 'cancelled'

export type CheckinType = 'in' | 'out'

export type WaterPointType = 'dam' | 'hydrant' | 'tank' | 'borehole' | 'pool' | 'river'

export type WaterPointStatus = 'operational' | 'low' | 'empty' | 'maintenance' | 'unknown'

export type FireType = 'veld' | 'structural' | 'vehicle' | 'electrical' | 'other'

export type FireStatus = 'reported' | 'active' | 'contained' | 'extinguished' | 'monitoring'

export type FireGroupType = 'community_team' | 'volunteer_brigade' | 'municipal_fd' | 'private_contractor'

export type FireGroupRole = 'leader' | 'driver' | 'member'

export type FireEquipmentType = 'tanker' | 'bakkie_skid' | 'pump' | 'trailer' | 'beaters' | 'hose_reel' | 'extinguisher'

export type FireEquipmentStatus = 'available' | 'deployed' | 'maintenance' | 'decommissioned'

// ---- Core Entities ----

export interface ElijahSection {
  id: string
  organization_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface ElijahHousehold {
  id: string
  organization_id: string
  section_id: string
  address: string
  unit_number: string | null
  primary_contact_id: string | null
  created_at: string
  updated_at: string
}

export interface ElijahMember {
  id: string
  organization_id: string
  user_id: string
  display_name: string
  phone: string | null
  household_id: string | null
  created_at: string
  updated_at: string
}

export interface ElijahMemberRole {
  id: string
  member_id: string
  role: ElijahRoleType
  granted_by: string | null
  granted_at: string
}

export interface ElijahMemberSensitiveProfile {
  id: string
  member_id: string
  medical_info: string | null
  emergency_contacts: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ElijahSensitiveAccessAudit {
  id: string
  member_id: string
  accessed_by: string
  access_type: string
  accessed_at: string
  ip_address: string | null
}

// ---- Incidents ----

export interface ElijahIncident {
  id: string
  organization_id: string
  type: IncidentType
  severity: Severity
  status: IncidentStatus
  location: { lat: number; lng: number } | null
  description: string
  reported_by: string
  created_at: string
  updated_at: string
}

export interface ElijahIncidentAssignment {
  id: string
  incident_id: string
  member_id: string
  assigned_by: string
  assigned_at: string
}

export interface ElijahIncidentTimelineEvent {
  id: string
  incident_id: string
  event_type: string
  actor_id: string | null
  notes: string | null
  created_at: string
}

export interface ElijahIncidentAttachment {
  id: string
  incident_id: string
  file_path: string
  file_type: string | null
  uploaded_by: string
  created_at: string
}

// ---- Patrols ----

export interface ElijahPatrol {
  id: string
  organization_id: string
  section_id: string | null
  scheduled_date: string
  start_time: string | null
  end_time: string | null
  recurrence: string | null
  status: PatrolStatus
  created_at: string
  updated_at: string
}

export interface ElijahPatrolCheckin {
  id: string
  patrol_id: string
  member_id: string
  checkin_type: CheckinType
  location: { lat: number; lng: number } | null
  created_at: string
}

// ---- Roll Call ----

export interface ElijahRollcallSchedule {
  id: string
  organization_id: string
  section_id: string | null
  time: string
  grace_minutes: number
  escalation_tiers: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ElijahRollcallCheckin {
  id: string
  schedule_id: string
  household_id: string
  status: CheckinStatus
  checked_in_by: string | null
  created_at: string
}

// ---- Fire Management ----

export interface ElijahFireWaterPoint {
  id: string
  organization_id: string
  name: string
  location: { lat: number; lng: number }
  type: WaterPointType
  capacity_litres: number | null
  status: WaterPointStatus
  access_notes: string | null
  last_inspected: string | null
  created_at: string
  updated_at: string
}

export interface ElijahFireFarm {
  id: string
  organization_id: string
  name: string
  owner_name: string
  owner_phone: string | null
  location: { lat: number; lng: number }
  boundary: unknown | null // GeoJSON polygon
  access_gate_location: { lat: number; lng: number } | null
  access_code: string | null // sensitive - gated
  access_notes: string | null
  created_at: string
  updated_at: string
}

export interface ElijahFireResponderGroup {
  id: string
  organization_id: string
  name: string
  type: FireGroupType
  contact_phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ElijahFireResponderGroupMember {
  id: string
  group_id: string
  member_id: string
  role: FireGroupRole
  created_at: string
}

export interface ElijahFireIncident {
  id: string
  incident_id: string
  fire_type: FireType
  wind_direction: string | null
  wind_speed_kmh: number | null
  area_affected_ha: number | null
  nearest_water_point_id: string | null
  farm_id: string | null
  status: FireStatus
  created_at: string
  updated_at: string
}

export interface ElijahFireIncidentWaterUsage {
  id: string
  fire_incident_id: string
  water_point_id: string
  litres_used: number
  reload_time_min: number | null
  notes: string | null
  logged_by: string
  logged_at: string
}

export interface ElijahFireIncidentGroupDispatch {
  id: string
  fire_incident_id: string
  group_id: string
  dispatched_by: string
  dispatched_at: string
  arrived_at: string | null
  stood_down_at: string | null
  notes: string | null
}

export interface ElijahFireEquipment {
  id: string
  organization_id: string
  name: string
  type: FireEquipmentType
  location_description: string | null
  assigned_group_id: string | null
  status: FireEquipmentStatus
  last_serviced: string | null
  created_at: string
  updated_at: string
}

// ---- Additional Tables (enhancements over spec) ----

export interface ElijahHouseholdBuddy {
  id: string
  household_id: string
  buddy_household_id: string
  created_at: string
}

export interface ElijahWhatsappSession {
  id: string
  organization_id: string
  phone: string
  command: string
  step: number
  data: Record<string, unknown>
  expires_at: string
  created_at: string
  updated_at: string
}

export interface ElijahNotificationPreference {
  id: string
  member_id: string
  incident_types: IncidentType[] | null
  min_severity: Severity | null
  fire_alerts: boolean
  rollcall_reminders: boolean
  patrol_updates: boolean
  created_at: string
  updated_at: string
}

export interface ElijahFireIncidentEquipment {
  id: string
  fire_incident_id: string
  equipment_id: string
  deployed_at: string
  returned_at: string | null
  notes: string | null
}
