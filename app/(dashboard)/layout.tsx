export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { getUserOrg } from '@/lib/auth/get-user-org'
import {
  UsageWarningBanner,
  thresholdFor,
} from './_components/usage-warning-banner'

interface MetricSnapshot {
  metric: string
  current: number
  limit: number
  percent: number
}

async function getUsageStats(organizationId: string) {
  // USAGE-13: client_usage_metrics dropped in migration 35.
  // Usage summary now sourced from get_usage_summary RPC (usage_events table).
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const supabase = createAdminClient()

  try {
    const { data: rpcResult } = await supabase.rpc('get_usage_summary', {
      p_org_id: organizationId,
    })

    type MetricSummary = { used: number; limit: number }
    const summary = (rpcResult ?? {}) as Record<string, MetricSummary>

    return {
      postsUsed: summary.social_posts?.used ?? 0,
      postsLimit: summary.social_posts?.limit ?? 30,
      aiGenerationsUsed: summary.ai_generations?.used ?? 0,
      aiGenerationsLimit: summary.ai_generations?.limit ?? 50,
    }
  } catch {
    return { postsUsed: 0, postsLimit: 30, aiGenerationsUsed: 0, aiGenerationsLimit: 50 }
  }
}

/**
 * USAGE-03: server-side fetch /api/usage/current.
 * Forwards the request cookie so the endpoint can resolve the user's org.
 * Returns [] on any error (banners are non-critical chrome — never block dashboard render).
 */
async function fetchCurrentUsage(): Promise<MetricSnapshot[]> {
  try {
    const h = await headers()
    const host = h.get('host') ?? 'draggonnb-platform.vercel.app'
    const proto = host.startsWith('localhost') ? 'http' : 'https'
    const cookie = h.get('cookie') ?? ''
    const res = await fetch(`${proto}://${host}/api/usage/current`, {
      headers: { cookie },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? (json as MetricSnapshot[]) : []
  } catch {
    return []
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: userOrg } = await getUserOrg()
  const usageStats = userOrg ? await getUsageStats(userOrg.organizationId) : undefined

  // USAGE-03 always-on banners. Filter to the metrics that have crossed
  // the 50% threshold; render in severity order (90% → 75% → 50%).
  const usage = userOrg ? await fetchCurrentUsage() : []
  type Banner = {
    metric: string
    used: number
    limit: number
    threshold: 0.5 | 0.75 | 0.9
  }
  const banners: Banner[] = usage
    .map((m): Banner | null => {
      const t = thresholdFor(m.current, m.limit)
      return t === null
        ? null
        : { metric: m.metric, used: m.current, limit: m.limit, threshold: t }
    })
    .filter((b): b is Banner => b !== null)
    .sort((a, b) => b.threshold - a.threshold)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar usageStats={usageStats} />

      {/* Header */}
      <DashboardHeader />

      {/* Main Content */}
      <main className="ml-64 mt-18 px-8 py-12">
        {/* USAGE-03: warning banners stack — only renders when at least one metric is >=50% */}
        {banners.length > 0 && (
          <div className="mb-6 space-y-2" data-testid="usage-warning-banner-stack">
            {banners.map((b) => (
              <UsageWarningBanner key={b.metric} {...b} />
            ))}
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
