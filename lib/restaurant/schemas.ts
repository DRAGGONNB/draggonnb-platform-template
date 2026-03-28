import { z } from 'zod'

// ─── Restaurant ───────────────────────────────────────────────

export const CreateRestaurantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  address: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().default('Africa/Johannesburg'),
  telegram_bot_token: z.string().optional(),
  telegram_channel_id: z.string().optional(),
  telegram_manager_id: z.string().optional(),
  payfast_merchant_id: z.string().optional(),
  payfast_merchant_key: z.string().optional(),
  payfast_passphrase: z.string().optional(),
  service_charge_pct: z.number().min(0).max(15).default(0),
  settings: z.record(z.unknown()).default({}),
})

export const UpdateRestaurantSchema = CreateRestaurantSchema.partial()

// ─── Staff ───────────────────────────────────────────────────

export const CreateStaffSchema = z.object({
  restaurant_id: z.string().uuid(),
  display_name: z.string().min(1).max(100),
  role: z.enum(['manager','chef','server','bartender','host','events_coordinator']),
  hourly_rate: z.number().min(0).optional(),
  employment_type: z.enum(['full_time','part_time','casual']).default('full_time'),
  phone: z.string().optional(),
  telegram_chat_id: z.string().optional(),
  whatsapp_number: z.string().optional(),
})

export const UpdateStaffSchema = CreateStaffSchema.partial()

// ─── Tables ───────────────────────────────────────────────────

export const CreateTableSchema = z.object({
  restaurant_id: z.string().uuid(),
  label: z.string().min(1).max(50),
  section: z.enum(['indoor','outdoor','private','bar','patio']).optional(),
  capacity: z.number().int().min(1).max(50).default(4),
})

export const UpdateTableSchema = CreateTableSchema.partial()

// ─── Menu ─────────────────────────────────────────────────────

export const CreateMenuCategorySchema = z.object({
  restaurant_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  sort_order: z.number().int().default(0),
})

export const CreateMenuItemSchema = z.object({
  restaurant_id: z.string().uuid(),
  category_id: z.string().uuid().optional(),
  name: z.string().min(1).max(150),
  description: z.string().optional(),
  price: z.number().min(0),
  allergens: z.array(z.string()).default([]),
  is_vegetarian: z.boolean().default(false),
  is_vegan: z.boolean().default(false),
  is_available: z.boolean().default(true),
  sort_order: z.number().int().default(0),
})

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial()

// ─── Sessions ─────────────────────────────────────────────────

export const OpenSessionSchema = z.object({
  table_id: z.string().uuid(),
  waiter_id: z.string().uuid(),
  party_size: z.number().int().min(1).max(20).default(1),
  split_mode: z.enum(['none','equal','by_item']).default('none'),
  guest_whatsapp: z.string().optional(),
  notes: z.string().optional(),
})

export const UpdateSessionStatusSchema = z.object({
  status: z.enum(['open','bill_requested','partially_paid','closed','voided']),
  notes: z.string().optional(),
})

// ─── Bill items ───────────────────────────────────────────────

export const AddBillItemSchema = z.object({
  session_id: z.string().uuid(),
  menu_item_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(50).default(1),
  modifier_notes: z.string().optional(),
})

export const VoidBillItemSchema = z.object({
  item_id: z.string().uuid(),
  void_reason: z.string().min(1),
  manager_pin: z.string().optional(),
})

// ─── Payment ──────────────────────────────────────────────────

export const RequestBillSchema = z.object({
  session_id: z.string().uuid(),
  tip_pct: z.number().min(0).max(50).default(0),
  tip_amount: z.number().min(0).optional(),
})

export const ClaimSplitSlotSchema = z.object({
  bill_id: z.string().uuid(),
  slot_number: z.number().int().min(1),
  whatsapp_number: z.string().optional(),
  display_name: z.string().optional(),
  item_ids: z.array(z.string().uuid()).optional(),
})

// ─── Reservations ─────────────────────────────────────────────

export const CreateReservationSchema = z.object({
  restaurant_id: z.string().uuid(),
  contact_id: z.string().uuid().optional(),
  table_id: z.string().uuid().optional(),
  reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reservation_time: z.string().regex(/^\d{2}:\d{2}$/),
  party_size: z.number().int().min(1).max(200),
  status: z.enum(['pending','confirmed','seated','completed','no_show','cancelled']).default('confirmed'),
  source: z.enum(['whatsapp','phone','walk_in','online','staff']).default('staff'),
  dietary_notes: z.string().optional(),
  special_requests: z.string().optional(),
  whatsapp_number: z.string().optional(),
})

export const UpdateReservationSchema = CreateReservationSchema.partial()

// ─── Shifts ───────────────────────────────────────────────────

export const CreateShiftSchema = z.object({
  restaurant_id: z.string().uuid(),
  staff_id: z.string().uuid(),
  shift_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  role: z.string().optional(),
  notes: z.string().optional(),
})

// ─── Temperature logs ─────────────────────────────────────────

export const CreateTempLogSchema = z.object({
  restaurant_id: z.string().uuid(),
  equipment_name: z.string().min(1).max(100),
  equipment_type: z.enum(['fridge','freezer','hot_hold','cooking','ambient']),
  temperature: z.number(),
  corrective_action: z.string().optional(),
})

// R638 thresholds
export const TEMP_THRESHOLDS: Record<string, { warning: number; critical: number; direction: 'above' | 'below' }> = {
  fridge:   { warning: 5,    critical: 8,    direction: 'above' },
  freezer:  { warning: -15,  critical: -10,  direction: 'above' },
  hot_hold: { warning: 60,   critical: 55,   direction: 'below' },
  cooking:  { warning: 60,   critical: 55,   direction: 'below' },
  ambient:  { warning: 25,   critical: 30,   direction: 'above' },
}

export function getTempStatus(type: string, temp: number): 'ok' | 'warning' | 'critical' {
  const threshold = TEMP_THRESHOLDS[type]
  if (!threshold) return 'ok'
  if (threshold.direction === 'above') {
    if (temp >= threshold.critical) return 'critical'
    if (temp >= threshold.warning) return 'warning'
  } else {
    if (temp <= threshold.critical) return 'critical'
    if (temp <= threshold.warning) return 'warning'
  }
  return 'ok'
}

// ─── Checklists ───────────────────────────────────────────────

export const ChecklistItemSchema = z.object({
  id: z.string(),
  task: z.string(),
  requires_photo: z.boolean().default(false),
  requires_temp: z.boolean().default(false),
})

export const CreateChecklistSchema = z.object({
  restaurant_id: z.string().uuid(),
  name: z.string().min(1).max(150),
  checklist_type: z.enum(['opening','closing','cleaning','temp_check','sop','event']),
  frequency: z.string().default('daily'),
  items: z.array(ChecklistItemSchema),
})

export const CompleteChecklistSchema = z.object({
  checklist_id: z.string().uuid(),
  restaurant_id: z.string().uuid(),
  completion_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items_completed: z.array(z.object({
    id: z.string(),
    completed: z.boolean(),
    photo_url: z.string().optional(),
    temp: z.number().optional(),
    notes: z.string().optional(),
  })),
})

// ─── Events ───────────────────────────────────────────────────

export const CreateEventSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  venue: z.string().optional(),
  expected_guests: z.number().int().min(1).optional(),
  budget: z.number().min(0).optional(),
  restaurant_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  notes: z.string().optional(),
})

export const UpdateEventSchema = CreateEventSchema.partial()

export const AssignEventStaffSchema = z.object({
  event_id: z.string().uuid(),
  staff_id: z.string().uuid(),
  role: z.string().optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
})

export const InviteEventGuestSchema = z.object({
  event_id: z.string().uuid(),
  contact_id: z.string().uuid().optional(),
  whatsapp_number: z.string().optional(),
  dietary_notes: z.string().optional(),
  table_assignment: z.string().optional(),
})
