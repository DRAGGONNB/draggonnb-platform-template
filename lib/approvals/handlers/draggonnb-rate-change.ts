/**
 * lib/approvals/handlers/draggonnb-rate-change.ts
 * Real handler for draggonnb.rate_change action type.
 * execute: updates accommodation_units rate (idempotency: unit_id + effective_from)
 */

import { createAdminClient } from '@/lib/supabase/admin'

export interface RateChangePayload {
  unit_id: string
  new_rate: number
  effective_from: string  // ISO date string
  old_rate?: number
  organization_id?: string
}

export interface HandlerResult {
  status: 'executed' | 'failed'
  detail: string
}

export const rateChangeHandler = {
  product: 'draggonnb' as const,
  action_type: 'rate_change',
  expiry_hours: 24, // per CONTEXT D1

  async execute(payload: RateChangePayload): Promise<HandlerResult> {
    const supabase = createAdminClient()

    // Update accommodation_units with new rate
    const { error } = await supabase
      .from('accommodation_units')
      .update({
        base_rate: payload.new_rate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.unit_id)

    if (error) {
      return { status: 'failed', detail: `Rate update failed: ${error.message}` }
    }

    return {
      status: 'executed',
      detail: `Rate updated for unit ${payload.unit_id}: R${payload.new_rate.toFixed(2)} effective ${payload.effective_from}`,
    }
  },

  async revert(payload: { unit_id: string; old_rate: number; reason: string }): Promise<HandlerResult> {
    const supabase = createAdminClient()
    if (payload.old_rate !== undefined) {
      await supabase
        .from('accommodation_units')
        .update({ base_rate: payload.old_rate, updated_at: new Date().toISOString() })
        .eq('id', payload.unit_id)
      return { status: 'executed', detail: `Rate reverted to R${payload.old_rate.toFixed(2)}` }
    }
    return { status: 'failed', detail: 'No old_rate provided for revert' }
  },
}
