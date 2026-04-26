export const dynamic = 'force-dynamic'

import { Sidebar } from '@/components/dashboard/Sidebar'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { getUserOrg } from '@/lib/auth/get-user-org'

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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: userOrg } = await getUserOrg()
  const usageStats = userOrg ? await getUsageStats(userOrg.organizationId) : undefined

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar usageStats={usageStats} />

      {/* Header */}
      <DashboardHeader />

      {/* Main Content */}
      <main className="ml-64 mt-18 px-8 py-12">
        {children}
      </main>
    </div>
  )
}
