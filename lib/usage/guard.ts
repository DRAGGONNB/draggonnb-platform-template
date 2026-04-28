/**
 * guardUsage — Pre-action usage cap enforcement
 *
 * Calls the record_usage_event RPC (advisory-lock-hardened in migration 28)
 * BEFORE any metered action. Throws UsageCapExceededError if the org is at
 * or over its monthly cap for the given metric.
 *
 * DO NOT call from middleware.ts — route-handler scope only.
 * DO NOT add to legacy routes (content/generate*, autopilot/*) — Phase 10 cleanup.
 *
 * RPC signature (from migration 12, hardened in migration 28):
 *   record_usage_event(p_org_id UUID, p_metric TEXT, p_quantity INTEGER, p_metadata JSONB)
 *   RETURNS JSONB { allowed: boolean, current: number, limit: number, remaining: number }
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { MeteredMetric, UsageCapExceededError } from './types'

export interface GuardUsageOptions {
  orgId: string
  metric: MeteredMetric
  qty?: number           // default 1
  idempotencyKey?: string // stored as metadata.idempotency_key for dedup logging
}

export async function guardUsage(opts: GuardUsageOptions): Promise<void> {
  const supabase = createAdminClient()
  const qty = opts.qty ?? 1

  const metadata = opts.idempotencyKey
    ? { idempotency_key: opts.idempotencyKey }
    : {}

  const { data, error } = await supabase.rpc('record_usage_event', {
    p_org_id: opts.orgId,
    p_metric: opts.metric,
    p_quantity: qty,
    p_metadata: metadata,
  })

  if (error) {
    // RPC execution error — propagate as 5xx upstream
    throw error
  }

  const result = data as { allowed: boolean; current: number; limit: number; remaining: number }

  if (result.allowed === false) {
    // Cap exceeded — surface current/limit for error context
    throw new UsageCapExceededError(
      opts.orgId,
      opts.metric,
      result.current,
      result.limit,
    )
  }
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Read the tier limit for a metric directly from billing_plans.
 * Only called on the failure path (cap exceeded) for error context.
 */
export async function fetchTierLimit(orgId: string, metric: MeteredMetric): Promise<number> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('organizations')
    .select('billing_plans!inner(limits)')
    .eq('id', orgId)
    .single()
  const limits = (data as { billing_plans: { limits: Record<string, number> } | null } | null)
    ?.billing_plans?.limits ?? {}
  return limits[metric] ?? Infinity
}
