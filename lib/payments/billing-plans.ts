import { createAdminClient } from '@/lib/supabase/admin'

export interface BillingPlan {
  id: string
  slug: string
  name: string
  priceZar: number // cents
  priceDisplay: string // formatted "R1,500"
  frequency: string
  payfastItemCode: string | null
  isActive: boolean
  features: string[]
  sortOrder: number
}

export interface PlanLimit {
  dimension: string
  includedQuantity: number
  overageRateZar: number // cents
}

// In-memory cache to avoid hitting DB on every pricing page load
let plansCache: BillingPlan[] | null = null
let plansCacheExpiry: number = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch all active billing plans from the database.
 * Results are cached in memory for 5 minutes.
 */
export async function fetchBillingPlans(): Promise<BillingPlan[]> {
  const now = Date.now()
  if (plansCache && now < plansCacheExpiry) {
    return plansCache
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('billing_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error || !data) {
    console.error('[BillingPlans] Failed to fetch plans:', error?.message)
    // Return cached data if available, even if expired
    return plansCache || []
  }

  const plans: BillingPlan[] = data.map((plan: Record<string, unknown>) => ({
    id: plan.id as string,
    slug: plan.slug as string,
    name: plan.name as string,
    priceZar: plan.price_zar as number,
    priceDisplay: formatZAR(plan.price_zar as number),
    frequency: plan.frequency as string,
    payfastItemCode: plan.payfast_item_code as string | null,
    isActive: plan.is_active as boolean,
    features: plan.features as string[],
    sortOrder: plan.sort_order as number,
  }))

  plansCache = plans
  plansCacheExpiry = now + CACHE_TTL_MS
  return plans
}

/**
 * Get a specific plan by slug.
 */
export async function getPlanBySlug(slug: string): Promise<BillingPlan | null> {
  const plans = await fetchBillingPlans()
  return plans.find(p => p.slug === slug) || null
}

/**
 * Get plan limits for a specific plan.
 */
export async function getPlanLimits(planId: string): Promise<PlanLimit[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('plan_limits')
    .select('dimension, included_quantity, overage_rate_zar')
    .eq('plan_id', planId)

  if (error || !data) {
    console.error('[BillingPlans] Failed to fetch plan limits:', error?.message)
    return []
  }

  return data.map((l: Record<string, unknown>) => ({
    dimension: l.dimension as string,
    includedQuantity: l.included_quantity as number,
    overageRateZar: l.overage_rate_zar as number,
  }))
}

/**
 * Match an organization's subscription_tier to a billing plan.
 * Used during the transition from hardcoded tiers to DB-driven plans.
 */
export async function matchOrganizationToPlan(
  subscriptionTier: string
): Promise<BillingPlan | null> {
  // Map legacy tier names to plan slugs
  const tierToSlug: Record<string, string> = {
    starter: 'core',
    professional: 'growth',
    enterprise: 'scale',
    core: 'core',
    growth: 'growth',
    scale: 'scale',
  }

  const slug = tierToSlug[subscriptionTier]
  if (!slug) return null

  return getPlanBySlug(slug)
}

/**
 * Invalidate the plans cache. Call after admin updates pricing.
 */
export function invalidatePlansCache(): void {
  plansCache = null
  plansCacheExpiry = 0
}

/**
 * Format cents amount as ZAR display string.
 * 150000 -> "R1,500"
 */
function formatZAR(cents: number): string {
  const rand = cents / 100
  return `R${rand.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
