import { z } from 'zod'

// ---------------------------------------------------------------------------
// Enum-like types
// ---------------------------------------------------------------------------

export const lineItemType = z.enum([
  'room_charge',
  'addon',
  'fee',
  'discount',
  'tax',
  'deposit',
  'refund',
  'adjustment',
  'service',
])

export const paymentStatus = z.enum([
  'pending',
  'completed',
  'failed',
  'refunded',
  'cancelled',
])

export const paymentGateway = z.enum([
  'payfast',
  'manual',
  'bank_transfer',
  'cash',
  'card',
  'eft',
  'other',
])

export const paymentMode = z.enum([
  'mode_a',
  'mode_b',
])

// ---------------------------------------------------------------------------
// Additional Fees
// ---------------------------------------------------------------------------

export const createFeeSchema = z.object({
  property_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  fee_type: z.string().min(1),
  amount: z.number().min(0),
  percentage: z.number().min(0).max(100).optional(),
  is_percentage: z.boolean().default(false),
  is_mandatory: z.boolean().default(false),
  applies_to: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  metadata: z.record(z.unknown()).optional(),
})

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

export const createUnitSchema = z.object({
  property_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  unit_type: z.string().min(1),
  status: z.enum(['active', 'inactive', 'maintenance']).default('active'),
  max_guests: z.number().int().min(1).default(2),
  bedrooms: z.number().int().min(0).default(1),
  bathrooms: z.number().min(0).default(1),
  base_price: z.number().min(0).default(0),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  sort_order: z.number().int().default(0),
  metadata: z.record(z.unknown()).optional(),
})

export const updateUnitSchema = createUnitSchema.partial()

// ---------------------------------------------------------------------------
// Guests
// ---------------------------------------------------------------------------

export const createGuestSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  id_number: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  vip_status: z.boolean().default(false),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const updateGuestSchema = createGuestSchema.partial()

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export const createBookingSchema = z.object({
  property_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  guest_id: z.string().uuid(),
  rate_plan_id: z.string().uuid().optional(),
  check_in_date: z.string().min(1),
  check_out_date: z.string().min(1),
  number_of_guests: z.number().int().min(1).default(1),
  special_requests: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const updateBookingSchema = z.object({
  status: z.enum([
    'inquiry',
    'quoted',
    'pending_deposit',
    'confirmed',
    'checked_in',
    'checked_out',
    'cancelled',
    'no_show',
  ]).optional(),
  unit_id: z.string().uuid().optional(),
  rate_plan_id: z.string().uuid().optional(),
  check_in_date: z.string().optional(),
  check_out_date: z.string().optional(),
  number_of_guests: z.number().int().min(1).optional(),
  special_requests: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  subtotal: z.number().min(0).optional(),
  discount_total: z.number().min(0).optional(),
  fee_total: z.number().min(0).optional(),
  tax_total: z.number().min(0).optional(),
  grand_total: z.number().min(0).optional(),
  amount_paid: z.number().min(0).optional(),
  balance_due: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
})

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export const createRoomSchema = z.object({
  unit_id: z.string().uuid(),
  name: z.string().min(1),
  room_type: z.string().min(1),
  description: z.string().optional(),
  bed_type: z.string().optional(),
  bed_count: z.number().int().min(0).default(1),
  max_occupancy: z.number().int().min(1).default(2),
  amenities: z.array(z.string()).optional(),
  sort_order: z.number().int().default(0),
  metadata: z.record(z.unknown()).optional(),
})

// ---------------------------------------------------------------------------
// Rate Plans
// ---------------------------------------------------------------------------

export const createRatePlanSchema = z.object({
  property_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  rate_type: z.string().min(1),
  base_rate: z.number().min(0),
  currency: z.string().default('ZAR'),
  min_nights: z.number().int().min(1).default(1),
  max_nights: z.number().int().optional(),
  valid_from: z.string().optional(),
  valid_to: z.string().optional(),
  applies_to_units: z.array(z.string().uuid()).optional(),
  status: z.enum(['active', 'inactive', 'draft']).default('active'),
  metadata: z.record(z.unknown()).optional(),
})

export const updateRatePlanSchema = createRatePlanSchema.partial()

// ---------------------------------------------------------------------------
// Rate Plan Prices
// ---------------------------------------------------------------------------

export const createRatePlanPriceSchema = z.object({
  rate_plan_id: z.string().uuid(),
  unit_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  price_per_night: z.number().min(0),
  extra_guest_charge: z.number().min(0).default(0),
  day_of_week: z.number().int().min(0).max(6).optional(),
  season: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

// ---------------------------------------------------------------------------
// Discount Rules
// ---------------------------------------------------------------------------

export const createDiscountSchema = z.object({
  property_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  discount_type: z.enum(['percentage', 'fixed']),
  value: z.number().min(0),
  code: z.string().optional(),
  min_nights: z.number().int().optional(),
  max_uses: z.number().int().optional(),
  valid_from: z.string().optional(),
  valid_to: z.string().optional(),
  applies_to_units: z.array(z.string().uuid()).optional(),
  applies_to_rate_plans: z.array(z.string().uuid()).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  metadata: z.record(z.unknown()).optional(),
})

// ---------------------------------------------------------------------------
// Deposit Policies
// ---------------------------------------------------------------------------

export const createDepositPolicySchema = z.object({
  property_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  deposit_type: z.enum(['percentage', 'fixed']),
  amount: z.number().min(0),
  due_days_before_checkin: z.number().int().min(0).default(0),
  is_refundable: z.boolean().default(true),
  refund_policy: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  metadata: z.record(z.unknown()).optional(),
})

// ---------------------------------------------------------------------------
// Cancellation Policies
// ---------------------------------------------------------------------------

export const createCancellationPolicySchema = z.object({
  property_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  cancellation_type: z.string().min(1),
  penalty_type: z.enum(['percentage', 'fixed', 'first_night', 'none']).default('none'),
  penalty_amount: z.number().min(0).default(0),
  free_cancellation_days: z.number().int().min(0).default(0),
  status: z.enum(['active', 'inactive']).default('active'),
  metadata: z.record(z.unknown()).optional(),
})

// ---------------------------------------------------------------------------
// Email Templates
// ---------------------------------------------------------------------------

export const createEmailTemplateSchema = z.object({
  property_id: z.string().uuid().optional(),
  trigger_type: z.string().min(1),
  name: z.string().min(1),
  subject: z.string().min(1),
  html_body: z.string().min(1),
  text_body: z.string().optional(),
  variables: z.array(z.string()).optional(),
  is_active: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
})

// ---------------------------------------------------------------------------
// Comms Timeline
// ---------------------------------------------------------------------------

export const createCommsTimelineSchema = z.object({
  booking_id: z.string().uuid().optional(),
  guest_id: z.string().uuid().optional(),
  channel: z.enum(['email', 'whatsapp', 'sms', 'telegram', 'phone', 'in_person', 'other']),
  direction: z.enum(['inbound', 'outbound']),
  message_type: z.string().min(1),
  subject: z.string().optional(),
  content_summary: z.string().min(1),
  recipient: z.string().optional(),
  external_id: z.string().optional(),
  status: z.string().default('sent'),
  metadata: z.record(z.unknown()).optional(),
})

// ---------------------------------------------------------------------------
// Automation Rules
// ---------------------------------------------------------------------------

export const createAutomationRuleSchema = z.object({
  name: z.string().min(1),
  trigger_event: z.string().min(1),
  channel: z.enum(['email', 'whatsapp', 'sms', 'telegram']),
  template_id: z.string().uuid().optional(),
  delay_minutes: z.number().int().min(0).default(0),
  conditions: z.record(z.unknown()).optional(),
  is_active: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
})

export const updateAutomationRuleSchema = createAutomationRuleSchema.partial()

// ---------------------------------------------------------------------------
// Send Message (Manual)
// ---------------------------------------------------------------------------

export const sendManualMessageSchema = z.object({
  channel: z.enum(['email', 'whatsapp', 'sms', 'telegram']),
  recipient: z.string().min(1),
  message: z.string().min(1),
  booking_id: z.string().uuid().optional(),
  guest_id: z.string().uuid().optional(),
  template_id: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Message Queue
// ---------------------------------------------------------------------------

export const updateMessageQueueSchema = z.object({
  status: z.enum(['pending', 'processing', 'sent', 'failed', 'cancelled']).optional(),
  scheduled_for: z.string().optional(),
  attempts: z.number().int().optional(),
  last_error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export const emitEventSchema = z.object({
  booking_id: z.string().uuid(),
  event: z.enum([
    'booking_confirmed',
    'booking_cancelled',
    'guest_checked_in',
    'guest_checked_out',
    'payment_received',
    'deposit_due',
    'check_in_24h',
    'check_out_reminder',
    'review_request',
    'turnover_needed',
    'maintenance_urgent',
    'vip_arrival',
  ]),
})

// ---------------------------------------------------------------------------
// Payment Links
// ---------------------------------------------------------------------------

export const createPaymentLinkSchema = z.object({
  booking_id: z.string().uuid(),
  amount: z.number().min(0),
  payment_type: z.enum(['deposit', 'balance', 'full', 'custom']),
  expires_in_hours: z.number().int().min(1).default(72),
  metadata: z.record(z.unknown()).optional(),
})

export const updatePaymentLinkSchema = z.object({
  status: z.enum(['pending', 'paid', 'expired', 'cancelled']).optional(),
  gateway_reference: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

// ---------------------------------------------------------------------------
// Generate Payment Link (via PayFast)
// ---------------------------------------------------------------------------

export const generatePaymentLinkRequestSchema = z.object({
  booking_id: z.string().uuid(),
  amount: z.number().min(0),
  payment_type: z.enum(['deposit', 'balance', 'full', 'custom']),
  expires_in_hours: z.number().int().min(1).default(72),
})

// ---------------------------------------------------------------------------
// Financial Snapshots
// ---------------------------------------------------------------------------

export const generateFinancialSnapshotSchema = z.object({
  date: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

export const createStaffSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  department: z.string().min(1),
  role: z.string().optional(),
  telegram_chat_id: z.string().optional(),
  telegram_username: z.string().optional(),
  is_active: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
})

export const updateStaffSchema = createStaffSchema.partial()

// ---------------------------------------------------------------------------
// Telegram Channels
// ---------------------------------------------------------------------------

export const createTelegramChannelSchema = z.object({
  department: z.string().min(1),
  channel_name: z.string().min(1),
  chat_id: z.string().min(1),
  bot_token: z.string().optional(),
  notification_types: z.array(z.string()).optional(),
  is_active: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
})

export const updateTelegramChannelSchema = createTelegramChannelSchema.partial()

// ---------------------------------------------------------------------------
// Task Assignments
// ---------------------------------------------------------------------------

export const createTaskAssignmentSchema = z.object({
  task_id: z.string().uuid(),
  task_type: z.enum(['housekeeping', 'turnover', 'maintenance', 'inspection', 'other']),
  staff_id: z.string().uuid(),
  notes: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_date: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const updateTaskAssignmentSchema = z.object({
  status: z.enum(['assigned', 'accepted', 'in_progress', 'completed', 'cancelled']).optional(),
  notes: z.string().optional(),
  completion_notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

// ---------------------------------------------------------------------------
// Daily Brief
// ---------------------------------------------------------------------------

export const dailyBriefQuerySchema = z.object({
  date: z.string().optional(),
})

// ---------------------------------------------------------------------------
// AI Configs
// ---------------------------------------------------------------------------

export const createAIConfigSchema = z.object({
  agent_type: z.enum(['quoter', 'concierge', 'reviewer', 'pricer']),
  is_enabled: z.boolean().default(true),
  system_prompt_override: z.string().optional(),
  model_override: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const updateAIConfigSchema = createAIConfigSchema.partial()

// ---------------------------------------------------------------------------
// AI: Generate Quote
// ---------------------------------------------------------------------------

export const generateQuoteSchema = z.object({
  inquiry_text: z.string().min(1),
  guest_name: z.string().optional(),
  guest_email: z.string().email().optional(),
  guest_phone: z.string().optional(),
  check_in_date: z.string().optional(),
  check_out_date: z.string().optional(),
  guests: z.number().int().min(1).optional(),
  property_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
})

// ---------------------------------------------------------------------------
// AI: Concierge
// ---------------------------------------------------------------------------

export const conciergeMessageSchema = z.object({
  message: z.string().min(1),
  guest_phone: z.string().optional(),
  guest_id: z.string().uuid().optional(),
  booking_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
})

// ---------------------------------------------------------------------------
// AI: Analyze Review
// ---------------------------------------------------------------------------

export const analyzeReviewSchema = z.object({
  review_text: z.string().min(1),
  reviewer_name: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  platform: z.string().optional(),
  booking_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
})

// ---------------------------------------------------------------------------
// AI: Pricing Analysis
// ---------------------------------------------------------------------------

export const pricingAnalysisSchema = z.object({
  period_start: z.string().min(1),
  period_end: z.string().min(1),
  property_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
})

// ---------------------------------------------------------------------------
// Cost Categories
// ---------------------------------------------------------------------------

export const createCostCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category_type: z.enum(['fixed', 'variable', 'per_booking', 'per_guest', 'consumable', 'other']),
  is_active: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
})

export const updateCostCategorySchema = createCostCategorySchema.partial()

// ---------------------------------------------------------------------------
// Unit Costs
// ---------------------------------------------------------------------------

export const createUnitCostSchema = z.object({
  unit_id: z.string().uuid(),
  category_id: z.string().uuid(),
  booking_id: z.string().uuid().optional(),
  cost_date: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().min(0),
  quantity: z.number().min(0).default(1),
  currency: z.string().default('ZAR'),
  is_recurring: z.boolean().default(false),
  recurrence_period: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const updateUnitCostSchema = createUnitCostSchema.partial()

// ---------------------------------------------------------------------------
// Cost Defaults
// ---------------------------------------------------------------------------

export const createCostDefaultSchema = z.object({
  category_id: z.string().uuid(),
  property_type: z.string().optional(),
  unit_type: z.string().optional(),
  default_amount: z.number().min(0),
  default_quantity: z.number().min(0).default(1),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
})

export const updateCostDefaultSchema = createCostDefaultSchema.partial()

// ---------------------------------------------------------------------------
// Stock Items
// ---------------------------------------------------------------------------

export const createStockItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  unit_of_measure: z.string().min(1),
  current_stock: z.number().min(0).default(0),
  min_stock_level: z.number().min(0).default(0),
  max_stock_level: z.number().min(0).optional(),
  cost_per_unit: z.number().min(0).default(0),
  supplier: z.string().optional(),
  is_active: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
})

export const updateStockItemSchema = createStockItemSchema.partial()

// ---------------------------------------------------------------------------
// Stock Movements
// ---------------------------------------------------------------------------

export const createStockMovementSchema = z.object({
  stock_item_id: z.string().uuid(),
  movement_type: z.enum(['in', 'out', 'adjustment', 'transfer', 'waste', 'return']),
  quantity: z.number(),
  unit_id: z.string().uuid().optional(),
  booking_id: z.string().uuid().optional(),
  reason: z.string().optional(),
  cost_per_unit: z.number().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
})

// ---------------------------------------------------------------------------
// Unit Profitability
// ---------------------------------------------------------------------------

export const generateProfitabilitySchema = z.object({
  period_start: z.string().min(1),
  period_end: z.string().min(1),
  unit_id: z.string().uuid().optional(),
})
