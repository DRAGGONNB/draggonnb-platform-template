import { createAdminClient } from '@/lib/supabase/admin'

export interface CostRow {
  orgId: string
  orgName: string
  subdomain: string | null
  costMTDZarCents: number
  mrrZarCents: number
  marginPct: number
  isOverFortyPctMrrFlag: boolean
  last30DaysCostTrend: { date: string; costZarCents: number }[]
}

/**
 * 40% MRR flag formula (USAGE-11 spec):
 *   monthly_cost_zar_cents > monthly_mrr_zar_cents * 0.40
 *
 * Special cases:
 * - MRR = 0 AND cost = 0: false (no spend, no flag)
 * - MRR = 0 AND cost > 0: true (any AI cost on a free org is a flag)
 */
export function isOverFortyPctMrrFlag(
  costMTDZarCents: number,
  mrrZarCents: number,
): boolean {
  if (mrrZarCents <= 0) return costMTDZarCents > 0
  return costMTDZarCents > mrrZarCents * 0.4
}

export function computeMarginPct(costZarCents: number, mrrZarCents: number): number {
  if (mrrZarCents <= 0) return 0
  return ((mrrZarCents - costZarCents) / mrrZarCents) * 100
}

export async function getCostMonitoringRows(): Promise<CostRow[]> {
  const supa = createAdminClient()

  // 1. Active orgs (excluding archived)
  const { data: orgs, error: orgErr } = await supa
    .from('organizations')
    .select('id, name, subdomain')
    .is('archived_at', null)
  if (orgErr) throw new Error(`orgs query: ${orgErr.message}`)
  if (!orgs || orgs.length === 0) return []

  // 2. Current subscription composition per org (effective_to IS NULL = current row)
  const { data: comps } = await supa
    .from('subscription_composition')
    .select('organization_id, monthly_total_zar_cents')
    .is('effective_to', null)
  const mrrByOrg = new Map<string, number>()
  for (const c of comps ?? []) {
    mrrByOrg.set(c.organization_id, c.monthly_total_zar_cents)
  }

  // 3. Cost MTD per org — SUM of daily_cost_rollup since month start
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthStartStr = monthStart.toISOString().slice(0, 10)

  const { data: mtdRows } = await supa
    .from('daily_cost_rollup')
    .select('organization_id, total_cost_zar_cents')
    .gte('rollup_date', monthStartStr)

  const costByOrg = new Map<string, number>()
  for (const r of mtdRows ?? []) {
    costByOrg.set(
      r.organization_id,
      (costByOrg.get(r.organization_id) ?? 0) + r.total_cost_zar_cents,
    )
  }

  // 4. 30-day trend per org — daily_cost_rollup last 30 days
  const trendStart = new Date()
  trendStart.setDate(trendStart.getDate() - 30)
  const trendStartStr = trendStart.toISOString().slice(0, 10)

  const { data: trendRows } = await supa
    .from('daily_cost_rollup')
    .select('organization_id, rollup_date, total_cost_zar_cents')
    .gte('rollup_date', trendStartStr)
    .order('rollup_date', { ascending: true })

  const trendByOrg = new Map<string, { date: string; costZarCents: number }[]>()
  for (const r of trendRows ?? []) {
    const arr = trendByOrg.get(r.organization_id) ?? []
    arr.push({ date: r.rollup_date as string, costZarCents: r.total_cost_zar_cents })
    trendByOrg.set(r.organization_id, arr)
  }

  // 5. Assemble rows sorted worst-margin first
  return orgs
    .map((o) => {
      const cost = costByOrg.get(o.id) ?? 0
      const mrr = mrrByOrg.get(o.id) ?? 0
      return {
        orgId: o.id,
        orgName: o.name,
        subdomain: o.subdomain ?? null,
        costMTDZarCents: cost,
        mrrZarCents: mrr,
        marginPct: computeMarginPct(cost, mrr),
        isOverFortyPctMrrFlag: isOverFortyPctMrrFlag(cost, mrr),
        last30DaysCostTrend: trendByOrg.get(o.id) ?? [],
      }
    })
    .sort((a, b) => a.marginPct - b.marginPct)
}
