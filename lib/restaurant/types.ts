export type StaffRole = 'manager' | 'chef' | 'server' | 'bartender' | 'host' | 'events_coordinator'
export type EmploymentType = 'full_time' | 'part_time' | 'casual'
export type TableSection = 'indoor' | 'outdoor' | 'private' | 'bar' | 'patio'
export type SessionStatus = 'open' | 'bill_requested' | 'partially_paid' | 'closed' | 'voided'
export type SplitMode = 'none' | 'equal' | 'by_item'
export type BillStatus = 'open' | 'pending_payment' | 'partially_paid' | 'paid' | 'voided'
export type PayerStatus = 'pending' | 'paid' | 'skipped'
export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'no_show' | 'cancelled'
export type ReservationSource = 'whatsapp' | 'phone' | 'walk_in' | 'online' | 'staff'
export type EquipmentType = 'fridge' | 'freezer' | 'hot_hold' | 'cooking' | 'ambient'
export type TempStatus = 'ok' | 'warning' | 'critical'
export type ChecklistType = 'opening' | 'closing' | 'cleaning' | 'temp_check' | 'sop' | 'event'
export type ShiftStatus = 'scheduled' | 'confirmed' | 'clocked_in' | 'clocked_out' | 'absent'

export interface Restaurant {
  id: string
  organization_id: string
  name: string
  slug: string | null
  address: string | null
  phone: string | null
  timezone: string
  telegram_bot_token: string | null
  telegram_channel_id: string | null
  telegram_manager_id: string | null
  payfast_merchant_id: string | null
  payfast_merchant_key: string | null
  service_charge_pct: number
  settings: Record<string, unknown>
  is_active: boolean
  created_at: string
}

export interface RestaurantTable {
  id: string
  organization_id: string
  restaurant_id: string
  label: string
  section: TableSection | null
  capacity: number
  qr_code_url: string | null
  qr_token: string
  is_active: boolean
}

export interface MenuItem {
  id: string
  restaurant_id: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  allergens: string[]
  is_vegetarian: boolean
  is_vegan: boolean
  is_available: boolean
  sort_order: number
}

export interface TableSession {
  id: string
  organization_id: string
  restaurant_id: string
  table_id: string
  waiter_id: string | null
  status: SessionStatus
  party_size: number
  split_mode: SplitMode
  guest_whatsapp: string | null
  opened_at: string
  closed_at: string | null
}

export interface Bill {
  id: string
  session_id: string
  restaurant_id: string
  subtotal: number
  service_charge_pct: number
  service_charge: number
  tip_total: number
  total: number
  currency: string
  status: BillStatus
}

export interface BillItem {
  id: string
  bill_id: string
  menu_item_id: string | null
  name: string
  quantity: number
  unit_price: number
  line_total: number
  modifier_notes: string | null
  added_by: string | null
  voided: boolean
  void_reason: string | null
}

export interface BillPayer {
  id: string
  bill_id: string
  slot_number: number
  whatsapp_number: string | null
  display_name: string
  amount_due: number | null
  amount_paid: number
  tip_amount: number
  status: PayerStatus
  payfast_token: string
  paid_at: string | null
}

// LiveTab guest view — full session with nested data
export interface LiveTabSession {
  session: TableSession
  bill: Bill & {
    bill_items: BillItem[]
    bill_payers: BillPayer[]
  }
  table: RestaurantTable
  restaurant: Pick<Restaurant, 'id' | 'name' | 'slug' | 'service_charge_pct'>
}
