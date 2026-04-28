/**
 * Cost Ceiling Guard
 *
 * Pre-call circuit breaker that blocks Anthropic API calls when an org's
 * month-to-date AI spend would exceed its tier ceiling.
 *
 * Tier ceilings (ZAR cents):
 *   core:           R150   = 15,000 cents
 *   growth:         R400   = 40,000 cents
 *   scale:          R1,500 = 150,000 cents
 *   platform_admin: unlimited (Number.MAX_SAFE_INTEGER)
 *
 * TIER RESOLUTION RULE:
 * - Always read organizations.plan_id (FK → billing_plans.id, canonical)
 * - NEVER read organizations.subscription_tier (legacy aliases: starter/professional/enterprise)
 * - Pass plan_id through getCanonicalTierName() to handle any aliases
 *
 * get_month_to_date_ai_cost RPC is defined in migration 27 (Phase 09-01).
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { getCanonicalTierName } from '@/lib/payments/payfast'
import { computeCostZarCents } from './cost-calculator'
import type { ModelId } from './model-registry'

// ============================================================================
// TIER CEILING CONSTANTS
// ============================================================================

/**
 * Per-tier monthly Anthropic cost ceilings in ZAR cents.
 * Keyed on canonical billing_plans.id values (core / growth / scale / platform_admin).
 */
export const TIER_CEILING_ZAR_CENTS: Record<string, number> = {
  core: 15_000,                        // R150
  growth: 40_000,                       // R400
  scale: 150_000,                       // R1,500
  platform_admin: Number.MAX_SAFE_INTEGER, // unlimited
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class CostCeilingExceededError extends Error {
  constructor(
    public readonly orgId: string,
    public readonly mtdSpendCents: number,
    public readonly projectedCents: number,
    public readonly ceilingCents: number,
  ) {
    super(
      `Cost ceiling exceeded for org ${orgId}: ` +
      `MTD ${mtdSpendCents} + projected ${projectedCents} = ` +
      `${mtdSpendCents + projectedCents} vs ceiling ${ceilingCents} ZAR cents`
    )
    this.name = 'CostCeilingExceededError'
  }
}

// ============================================================================
// CHECK COST CEILING (pre-call circuit breaker)
// ============================================================================

/**
 * Throws CostCeilingExceededError if the org's projected spend this month
 * would exceed their tier ceiling.
 *
 * Called BEFORE every Anthropic API call in BaseAgent.run().
 * Reads organizations.plan_id (canonical tier) and calls
 * get_month_to_date_ai_cost RPC (migration 27).
 */
export async function checkCostCeiling(
  orgId: string,
  projectedCostZarCents: number,
): Promise<void> {
  const supabase = createAdminClient()

  // Fetch org tier + MTD spend in parallel for minimum latency
  const [orgResult, mtdResult] = await Promise.all([
    supabase.from('organizations').select('plan_id').eq('id', orgId).single(),
    supabase.rpc('get_month_to_date_ai_cost', { p_org_id: orgId }),
  ])

  // Canonical tier resolution: plan_id → canonical name
  // getCanonicalTierName handles legacy aliases (starter→core, professional→growth, enterprise→scale)
  const rawTier = orgResult.data?.plan_id ?? 'core'
  const canonicalTier = getCanonicalTierName(rawTier)
  const ceiling = TIER_CEILING_ZAR_CENTS[canonicalTier] ?? TIER_CEILING_ZAR_CENTS.core

  const mtdSpend = (mtdResult.data as number | null) ?? 0

  if (mtdSpend + projectedCostZarCents > ceiling) {
    throw new CostCeilingExceededError(orgId, mtdSpend, projectedCostZarCents, ceiling)
  }
}

// ============================================================================
// PROJECT COST (pre-call cost estimate)
// ============================================================================

/**
 * Estimate the cost of a request BEFORE calling Anthropic.
 * Uses input token estimate + worst-case max_tokens (no cache hits assumed).
 *
 * Used by BaseAgent.run() to determine if the call should proceed.
 * Intentionally conservative — actual cost from response.usage may be lower.
 */
export function projectCost(
  inputTokensEstimate: number,
  maxOutputTokens: number,
  model: ModelId,
): number {
  return computeCostZarCents(
    { input_tokens: inputTokensEstimate, output_tokens: maxOutputTokens },
    model,
  )
}
