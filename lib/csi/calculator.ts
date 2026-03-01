import { createAdminClient } from '@/lib/supabase/admin'

export interface CSIScore {
  organizationId: string
  orgName: string
  overall: number // 0-100
  band: 'green' | 'yellow' | 'orange' | 'red'
  components: {
    usageRate: number
    featureAdoption: number
    supportHealth: number
    paymentStatus: number
    engagement: number
  }
  recommendation: string
  calculatedAt: string
}

const WEIGHTS = {
  usageRate: 0.30,
  featureAdoption: 0.20,
  supportHealth: 0.20,
  paymentStatus: 0.15,
  engagement: 0.15,
}

function getBand(score: number): CSIScore['band'] {
  if (score >= 80) return 'green'
  if (score >= 60) return 'yellow'
  if (score >= 40) return 'orange'
  return 'red'
}

function getRecommendation(band: CSIScore['band']): string {
  switch (band) {
    case 'green': return 'Expansion candidate - suggest referral program and upsell'
    case 'yellow': return 'Schedule check-in - identify friction points'
    case 'orange': return 'Intervention needed - personal outreach required'
    case 'red': return 'Churn prevention - immediate action required'
  }
}

export async function calculateCSI(organizationId: string): Promise<CSIScore> {
  const supabase = createAdminClient()

  // Fetch org details
  const { data: org } = await supabase
    .from('organizations')
    .select('name, subscription_status, activated_at')
    .eq('id', organizationId)
    .single()

  // 1. Usage Rate: average usage across dimensions
  const { data: usageData } = await supabase
    .from('usage_current_period')
    .select('used, total_available')
    .eq('organization_id', organizationId)

  let usageRate = 50 // default
  if (usageData && usageData.length > 0) {
    const avgUsage = usageData.reduce((sum: number, d: Record<string, number>) => {
      const pct = d.total_available > 0 ? (d.used / d.total_available) * 100 : 0
      return sum + Math.min(100, pct)
    }, 0) / usageData.length
    // Sweet spot: 30-80% usage is ideal. Under 10% or over 100% are concerning
    if (avgUsage >= 30 && avgUsage <= 80) usageRate = 100
    else if (avgUsage > 80) usageRate = Math.max(60, 100 - (avgUsage - 80) * 2)
    else usageRate = Math.max(20, avgUsage * 3)
  }

  // 2. Feature Adoption: count distinct dimensions with usage > 0
  const totalDimensions = 5 // ai_generations, social_posts, email_sends, agent_invocations, autopilot_runs
  const adoptedDimensions = usageData?.filter((d: Record<string, number>) => d.used > 0).length || 0
  const featureAdoption = Math.round((adoptedDimensions / totalDimensions) * 100)

  // 3. Support Health: assume healthy (no support ticket system yet)
  const supportHealth = 80

  // 4. Payment Status
  let paymentStatus = 50
  if (org?.subscription_status === 'active') paymentStatus = 100
  else if (org?.subscription_status === 'trialing') paymentStatus = 80
  else if (org?.subscription_status === 'payment_pending') paymentStatus = 60
  else if (org?.subscription_status === 'payment_failed') paymentStatus = 20
  else if (org?.subscription_status === 'cancelled') paymentStatus = 0

  // 5. Engagement: recent usage events in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: recentEvents } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('created_at', sevenDaysAgo)

  let engagement = 30
  if ((recentEvents || 0) > 50) engagement = 100
  else if ((recentEvents || 0) > 20) engagement = 80
  else if ((recentEvents || 0) > 5) engagement = 60
  else if ((recentEvents || 0) > 0) engagement = 40

  const overall = Math.round(
    usageRate * WEIGHTS.usageRate +
    featureAdoption * WEIGHTS.featureAdoption +
    supportHealth * WEIGHTS.supportHealth +
    paymentStatus * WEIGHTS.paymentStatus +
    engagement * WEIGHTS.engagement
  )

  const band = getBand(overall)

  return {
    organizationId,
    orgName: org?.name || 'Unknown',
    overall,
    band,
    components: { usageRate, featureAdoption, supportHealth, paymentStatus, engagement },
    recommendation: getRecommendation(band),
    calculatedAt: new Date().toISOString(),
  }
}

/**
 * Calculate CSI for all active organizations.
 */
export async function calculateAllCSI(): Promise<CSIScore[]> {
  const supabase = createAdminClient()

  const { data: orgs } = await supabase
    .from('tenant_subscriptions')
    .select('organization_id')
    .in('status', ['active', 'trialing'])

  if (!orgs) return []

  const scores = await Promise.all(
    orgs.map((o: { organization_id: string }) => calculateCSI(o.organization_id))
  )

  return scores
}
