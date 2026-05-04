/**
 * lib/approvals/handler-registry.ts
 * Maps qualified action keys (product.action_type) to handler implementations + metadata.
 * Created in Phase 14 as the runtime handler lookup mechanism for the approval spine.
 *
 * Format: HANDLER_REGISTRY['draggonnb.damage_charge'] = { handler, expiry_hours }
 * This is separate from MODULE_REGISTRY (which is a descriptive manifest array — Phase 13).
 *
 * Expiry hours per CONTEXT D1:
 *   damage_charge: 168 (7 days)
 *   rate_change: 24
 *   social_post: 48
 *   quota_change: 24
 *   safari_status_change: 24
 *   supplier_job_approval: 72
 */

import { damageChargeHandler } from './handlers/draggonnb-damage-charge'
import { rateChangeHandler } from './handlers/draggonnb-rate-change'
import { contentPostHandler } from './handlers/draggonnb-content-post'
import { quotaChangeHandler } from './handlers/trophy-quota-change'
import { safariStatusChangeHandler } from './handlers/trophy-safari-status-change'
import { supplierJobApprovalHandler } from './handlers/trophy-supplier-job-approval'

export interface HandlerRegistryEntry {
  handler: {
    execute(payload: any): Promise<{ status: string; detail: string }>
    revert?(payload: any): Promise<{ status: string; detail: string }>
  }
  expiry_hours: number
  product: 'draggonnb' | 'trophy'
  action_type: string
}

/**
 * HANDLER_REGISTRY maps '{product}.{action_type}' qualified keys to handler entries.
 * Used by spine.ts for propose expiry resolution + worker.ts for handler dispatch.
 */
export const HANDLER_REGISTRY: Record<string, HandlerRegistryEntry> = {
  'draggonnb.damage_charge': {
    handler: damageChargeHandler,
    expiry_hours: damageChargeHandler.expiry_hours,
    product: 'draggonnb',
    action_type: 'damage_charge',
  },
  'draggonnb.rate_change': {
    handler: rateChangeHandler,
    expiry_hours: rateChangeHandler.expiry_hours,
    product: 'draggonnb',
    action_type: 'rate_change',
  },
  'draggonnb.social_post': {
    handler: contentPostHandler,
    expiry_hours: contentPostHandler.expiry_hours,
    product: 'draggonnb',
    action_type: 'social_post',
  },
  'trophy.quota_change': {
    handler: quotaChangeHandler,
    expiry_hours: quotaChangeHandler.expiry_hours,
    product: 'trophy',
    action_type: 'quota_change',
  },
  'trophy.safari_status_change': {
    handler: safariStatusChangeHandler,
    expiry_hours: safariStatusChangeHandler.expiry_hours,
    product: 'trophy',
    action_type: 'safari_status_change',
  },
  'trophy.supplier_job_approval': {
    handler: supplierJobApprovalHandler,
    expiry_hours: supplierJobApprovalHandler.expiry_hours,
    product: 'trophy',
    action_type: 'supplier_job_approval',
  },
}
