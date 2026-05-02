// lib/modules/types.ts
// Module manifest contract for DraggonnB OS (Phase 13 / MANIFEST-01)
// PURELY DESCRIPTIVE — no executable code at import time.
//
// Canonical Telegram callback_data format (Phase 14 will consume this in grammY):
//   approve:{product}:{action_type}:{resource_id}
//   reject:{product}:{action_type}:{resource_id}
//   ack:{product}:{task_type}:{task_id}      (non-approval acknowledgements)
// TelegramCallbackSpec.action_key supplies the {action_type} or {task_type} token.

// ─── Module ID union ─────────────────────────────────────────────────────────

export type ModuleId =
  | 'accommodation'
  | 'crm'
  | 'events'
  | 'ai_agents'
  | 'analytics'
  | 'security_ops'
  | 'trophy' // reserved for cross-product

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

export interface TenantInputSpec {
  key: string // dot-path in tenant_modules.config, e.g. "accommodation.damage_price_list"
  type: 'text' | 'number' | 'json' | 'boolean' | 'select' | 'file_upload'
  label: string // displayed in onboarding wizard
  placeholder?: string
  required: boolean
  validation?: string // Zod schema string or regex
  options?: string[] // for 'select' type
}

export interface EmittedEventSpec {
  event_type: string // e.g. "booking.checked_out", "damage.flagged"
  description: string
  payload_schema?: string // JSON schema string for documentation
}

export interface ApprovalActionSpec {
  action_type: string // e.g. "damage_charge" — combined with product: "draggonnb.damage_charge"
  display_name: string // "Damage Charge Approval"
  required_roles: string[] // roles that can APPROVE this action type
  handler_path: string // relative import: "lib/approvals/handlers/damage-charge"
  description: string
}

export interface TelegramCallbackSpec {
  action_key: string // e.g. "damage_charge" → callback_data: "approve:draggonnb:damage_charge:{id}"
  display_name: string // shown in Telegram message
  handler_path: string // relative import for the callback handler
}

export interface BillingLineTypeSpec {
  source_type: string // e.g. "accommodation_night", "damage_charge", "game_drive_addon"
  display_label: string // shown on invoice line item
  vat_applicable: boolean
  unit: string // "night", "per booking", "per item", "per hunter per day"
}

// ─── Root manifest type ──────────────────────────────────────────────────────

export interface ModuleManifest {
  id: ModuleId
  name: string // human display name
  version: string // semver of this manifest definition
  product: 'draggonnb' | 'trophy' // which product owns this module
  required_tenant_inputs: TenantInputSpec[]
  emitted_events: EmittedEventSpec[]
  approval_actions: ApprovalActionSpec[]
  telegram_callbacks: TelegramCallbackSpec[]
  billing_line_types: BillingLineTypeSpec[]
}
