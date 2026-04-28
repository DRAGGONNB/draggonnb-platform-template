/**
 * GET /api/usage/current
 *
 * Returns the calling org's currently-metered metrics with usage percentages,
 * sourced from the `get_usage_summary` RPC (advisory-locked aggregate over
 * `usage_events` keyed by org month).
 *
 * Consumed by the dashboard layout (USAGE-03) to render UsageWarningBanner for
 * any metric whose used/limit ratio is >= 0.50.
 *
 * Response shape:
 *   [{ metric: string, current: number, limit: number, percent: number }]
 *
 * Returns 401 when no authenticated user/org context is present.
 */
import { getUserOrg } from '@/lib/auth/get-user-org'
import { getUsageSummary } from '@/lib/usage/meter'

interface MetricSnapshot {
  metric: string
  current: number
  limit: number
  percent: number
}

export async function GET() {
  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return Response.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const { data: summary, error } = await getUsageSummary(userOrg.organizationId)
  if (error || !summary) {
    // Surface as empty array rather than 500 — the banner is non-critical chrome.
    return Response.json([], { status: 200 })
  }

  const snapshots: MetricSnapshot[] = []
  for (const entry of Object.values(summary)) {
    if (typeof entry.limit !== 'number' || entry.limit <= 0) continue
    snapshots.push({
      metric: entry.metric,
      current: entry.used,
      limit: entry.limit,
      percent: entry.percent,
    })
  }

  return Response.json(snapshots)
}
