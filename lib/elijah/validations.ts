import { z } from 'zod'

// ---- Sections ----
export const createSectionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
})

// ---- Households ----
export const createHouseholdSchema = z.object({
  section_id: z.string().uuid().nullable().optional(),
  address: z.string().min(1).max(500),
  unit_number: z.string().max(50).nullable().optional(),
  primary_contact_id: z.string().uuid().nullable().optional(),
})

// ---- Members ----
export const createMemberSchema = z.object({
  user_id: z.string().uuid().optional(),
  display_name: z.string().min(1).max(255),
  phone: z.string().max(20).nullable().optional(),
  household_id: z.string().uuid().nullable().optional(),
  roles: z.array(z.enum(['admin', 'dispatcher', 'patroller', 'household_contact', 'member', 'fire_coordinator'])).optional(),
})

export const updateMemberSchema = createMemberSchema.partial()

// ---- Incidents ----
export const createIncidentSchema = z.object({
  type: z.enum(['break_in', 'fire', 'medical', 'suspicious_activity', 'noise', 'infrastructure', 'other']),
  severity: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  description: z.string().min(1).max(5000),
  location: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
})

export const updateIncidentSchema = z.object({
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  description: z.string().min(1).max(5000).optional(),
})

export const createTimelineEventSchema = z.object({
  event_type: z.string().min(1).max(100),
  notes: z.string().max(2000).nullable().optional(),
})

export const createAssignmentSchema = z.object({
  member_id: z.string().uuid(),
})

// ---- Roll Call ----
export const createRollcallScheduleSchema = z.object({
  section_id: z.string().uuid().nullable().optional(),
  time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  grace_minutes: z.number().int().min(1).max(60).default(10),
  escalation_tiers: z.record(z.unknown()).optional(),
})

export const rollcallCheckinSchema = z.object({
  schedule_id: z.string().uuid(),
  household_id: z.string().uuid(),
  status: z.enum(['safe', 'help', 'away']),
})

// ---- Patrols ----
export const createPatrolSchema = z.object({
  section_id: z.string().uuid().nullable().optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  recurrence: z.string().max(100).nullable().optional(),
})

export const patrolCheckinSchema = z.object({
  checkin_type: z.enum(['in', 'out']),
  location: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
})

// ---- Fire: Water Points ----
export const createWaterPointSchema = z.object({
  name: z.string().min(1).max(255),
  location: z.object({ lat: z.number(), lng: z.number() }),
  type: z.enum(['dam', 'hydrant', 'tank', 'borehole', 'pool', 'river']),
  capacity_litres: z.number().int().positive().nullable().optional(),
  status: z.enum(['operational', 'low', 'empty', 'maintenance', 'unknown']).default('unknown'),
  access_notes: z.string().max(1000).nullable().optional(),
})

export const updateWaterPointSchema = createWaterPointSchema.partial()

// ---- Fire: Farms ----
export const createFarmSchema = z.object({
  name: z.string().min(1).max(255),
  owner_name: z.string().min(1).max(255),
  owner_phone: z.string().max(20).nullable().optional(),
  location: z.object({ lat: z.number(), lng: z.number() }),
  access_gate_location: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
  access_code: z.string().max(100).nullable().optional(),
  access_notes: z.string().max(2000).nullable().optional(),
})

export const updateFarmSchema = createFarmSchema.partial()

// ---- Fire: Responder Groups ----
export const createResponderGroupSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['community_team', 'volunteer_brigade', 'municipal_fd', 'private_contractor']),
  contact_phone: z.string().max(20).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export const addGroupMemberSchema = z.object({
  member_id: z.string().uuid(),
  role: z.enum(['leader', 'driver', 'member']).default('member'),
})

// ---- Fire: Equipment ----
export const createEquipmentSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['tanker', 'bakkie_skid', 'pump', 'trailer', 'beaters', 'hose_reel', 'extinguisher']),
  location_description: z.string().max(500).nullable().optional(),
  assigned_group_id: z.string().uuid().nullable().optional(),
  status: z.enum(['available', 'deployed', 'maintenance', 'decommissioned']).default('available'),
})

export const updateEquipmentSchema = createEquipmentSchema.partial()

// ---- Fire: Incidents ----
export const createFireIncidentSchema = z.object({
  fire_type: z.enum(['veld', 'structural', 'vehicle', 'electrical', 'other']).default('veld'),
  wind_direction: z.string().max(50).nullable().optional(),
  wind_speed_kmh: z.number().positive().nullable().optional(),
  description: z.string().min(1).max(5000),
  location: z.object({ lat: z.number(), lng: z.number() }),
  farm_id: z.string().uuid().nullable().optional(),
})

export const createDispatchSchema = z.object({
  group_id: z.string().uuid(),
})

export const logWaterUsageSchema = z.object({
  water_point_id: z.string().uuid(),
  litres_used: z.number().int().positive(),
  reload_time_min: z.number().int().positive().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})
