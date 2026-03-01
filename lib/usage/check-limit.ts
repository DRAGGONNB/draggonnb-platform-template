import { createAdminClient } from '@/lib/supabase/admin'
import type { UsageDimension } from './meter'

export interface UsageLimitResult {
  allowed: boolean
  current: number
  planIncluded: number
  totalAvailable: number
  percent: number
  overageAvailable: boolean
  overageRateZar: number // cents per unit
  upgradeRequired?: string
  reason?: string
}

/**
 * Check whether an organization can use more of a given dimension.
 *
 * Reads from billing_plans + plan_limits + usage_events tables.
 * Falls back to the legacy feature-gate system if no tenant_subscription exists.
 */
export async function checkUsageLimit(
  organizationId: string,
  dimension: UsageDimension
): Promise<UsageLimitResult> {
  const supabase = createAdminClient()

  // 1. Get tenant subscription + plan limits
  const { data: sub } = await supabase
    .from('tenant_subscriptions')
    .select(`
      id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      billing_plans!inner (
        slug,
        name
      )
    `)
    .eq('organization_id', organizationId)
    .in('status', ['active', 'trialing'])
    .single()

  // No subscription found -- fall back to legacy system
  if (!sub) {
    return {
      allowed: true,
      current: 0,
      planIncluded: 0,
      totalAvailable: 0,
      percent: 0,
      overageAvailable: false,
      overageRateZar: 0,
      reason: 'No subscription found, using legacy limits',
    }
  }

  // 2. Get plan limit for this dimension
  const { data: limit } = await supabase
    .from('plan_limits')
    .select('included_quantity, overage_rate_zar')
    .eq('plan_id', sub.plan_id)
    .eq('dimension', dimension)
    .single()

  if (!limit) {
    // Dimension not configured for this plan -- allow by default
    return {
      allowed: true,
      current: 0,
      planIncluded: 0,
      totalAvailable: 0,
      percent: 0,
      overageAvailable: false,
      overageRateZar: 0,
      reason: `Dimension '${dimension}' not configured for plan`,
    }
  }

  // 3. Get current period usage from usage_events
  const { count } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('dimension', dimension)
    .gte('created_at', sub.current_period_start)
    .lt('created_at', sub.current_period_end)

  const current = count || 0
  const planIncluded = limit.included_quantity
  const overageRateZar = limit.overage_rate_zar
  const overageAvailable = overageRateZar > 0

  // For "unlimited" plans (999999), always allow
  const isUnlimited = planIncluded >= 999999
  const totalAvailable = planIncluded // bolt-on credits added in Sprint 2
  const percent = isUnlimited ? 0 : totalAvailable > 0 ? Math.round((current / totalAvailable) * 100) : 0

  const allowed = isUnlimited || current < totalAvailable || overageAvailable

  const result: UsageLimitResult = {
    allowed,
    current,
    planIncluded,
    totalAvailable,
    percent,
    overageAvailable,
    overageRateZar,
  }

  if (!allowed) {
    // Suggest upgrade
    const planSlug = (sub.billing_plans as unknown as { slug: string }).slug
    const tierOrder = ['core', 'growth', 'scale']
    const currentIdx = tierOrder.indexOf(planSlug)
    if (currentIdx < tierOrder.length - 1) {
      result.upgradeRequired = tierOrder[currentIdx + 1]
    }
    result.reason = `Monthly ${dimension.replace(/_/g, ' ')} limit reached (${current}/${totalAvailable})`
  }

  return result
}

/**
 * Get usage summary for all dimensions for an organization.
 * Useful for the client-facing usage dashboard.
 */
export async function getUsageSummary(
  organizationId: string
): Promise<Record<string, UsageLimitResult>> {
  const dimensions: UsageDimension[] = [
    'ai_generations',
    'social_posts',
    'email_sends',
    'agent_invocations',
    'autopilot_runs',
  ]

  const results: Record<string, UsageLimitResult> = {}

  // Run all checks in parallel
  const checks = await Promise.all(
    dimensions.map(dim => checkUsageLimit(organizationId, dim))
  )

  dimensions.forEach((dim, i) => {
    results[dim] = checks[i]
  })

  return results
}
