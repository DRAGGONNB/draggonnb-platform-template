import { createAdminClient } from '@/lib/supabase/admin'
import { fetchBillingPlans, type BillingPlan } from '@/lib/payments/billing-plans'

export interface UpsellRecommendation {
  shouldUpsell: boolean
  reason: string
  currentPlanSlug: string
  suggestedPlanSlug: string | null
  boltOnSpendCents: number
  nextTierPriceCents: number
  savings: string | null
}

/**
 * Evaluate whether an organization should be upsold to a higher tier.
 *
 * Triggers:
 * - Bolt-on spend > 50% of the price difference to next tier
 * - 3+ bolt-on purchases in current billing period
 */
export async function evaluateUpsell(organizationId: string): Promise<UpsellRecommendation> {
  const supabase = createAdminClient()

  // Get current subscription
  const { data: sub } = await supabase
    .from('tenant_subscriptions')
    .select('plan_id, current_period_start, billing_plans!inner (slug, price_zar)')
    .eq('organization_id', organizationId)
    .in('status', ['active', 'trialing'])
    .single()

  if (!sub) {
    return { shouldUpsell: false, reason: 'No active subscription', currentPlanSlug: '', suggestedPlanSlug: null, boltOnSpendCents: 0, nextTierPriceCents: 0, savings: null }
  }

  const plan = sub.billing_plans as unknown as { slug: string; price_zar: number }
  const currentSlug = plan.slug
  const currentPriceCents = plan.price_zar

  // Get all plans to find the next tier
  const allPlans = await fetchBillingPlans()
  const tierOrder = ['core', 'growth', 'scale']
  const currentIdx = tierOrder.indexOf(currentSlug)

  if (currentIdx >= tierOrder.length - 1) {
    return { shouldUpsell: false, reason: 'Already on highest tier', currentPlanSlug: currentSlug, suggestedPlanSlug: null, boltOnSpendCents: 0, nextTierPriceCents: 0, savings: null }
  }

  const nextSlug = tierOrder[currentIdx + 1]
  const nextPlan = allPlans.find((p: BillingPlan) => p.slug === nextSlug)
  if (!nextPlan) {
    return { shouldUpsell: false, reason: 'Next tier not found', currentPlanSlug: currentSlug, suggestedPlanSlug: nextSlug, boltOnSpendCents: 0, nextTierPriceCents: 0, savings: null }
  }

  const nextPriceCents = nextPlan.priceZar
  const priceDiff = nextPriceCents - currentPriceCents

  // Calculate bolt-on spend in current period
  const { data: creditPurchases } = await supabase
    .from('tenant_credits')
    .select('credit_packs!inner (price_zar)')
    .eq('organization_id', organizationId)
    .eq('source', 'purchase')
    .gte('purchased_at', sub.current_period_start)

  const boltOnSpendCents = (creditPurchases || []).reduce(
    (sum: number, c: Record<string, unknown>) => sum + ((c.credit_packs as { price_zar: number })?.price_zar || 0), 0
  )

  const purchaseCount = creditPurchases?.length || 0

  // Upsell trigger 1: bolt-on spend > 50% of tier price difference
  if (boltOnSpendCents > priceDiff * 0.5) {
    const monthlySavings = boltOnSpendCents - priceDiff
    return {
      shouldUpsell: true,
      reason: `Bolt-on spend (R${(boltOnSpendCents / 100).toFixed(2)}) exceeds 50% of upgrade cost`,
      currentPlanSlug: currentSlug,
      suggestedPlanSlug: nextSlug,
      boltOnSpendCents,
      nextTierPriceCents: nextPriceCents,
      savings: monthlySavings > 0 ? `R${(monthlySavings / 100).toFixed(2)}/month` : null,
    }
  }

  // Upsell trigger 2: 3+ bolt-on purchases in one billing period
  if (purchaseCount >= 3) {
    return {
      shouldUpsell: true,
      reason: `${purchaseCount} bolt-on purchases this period - frequent buyer pattern`,
      currentPlanSlug: currentSlug,
      suggestedPlanSlug: nextSlug,
      boltOnSpendCents,
      nextTierPriceCents: nextPriceCents,
      savings: null,
    }
  }

  return {
    shouldUpsell: false,
    reason: 'No upsell triggers met',
    currentPlanSlug: currentSlug,
    suggestedPlanSlug: nextSlug,
    boltOnSpendCents,
    nextTierPriceCents: nextPriceCents,
    savings: null,
  }
}
