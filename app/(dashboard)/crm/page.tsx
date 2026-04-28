import { redirect } from 'next/navigation'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { ModuleHome } from '@/components/module-home/ModuleHome'
import { loadEasyViewData } from '@/lib/crm/easy-view-data'
import { resolveUiMode } from '@/lib/crm/ui-mode'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function CRMHomePage() {
  const { data: userOrg, error } = await getUserOrg()
  if (error || !userOrg) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-800">Unable to load CRM</h2>
          <p className="mt-2 text-sm text-red-600">
            There was a problem loading your account data. Please try refreshing the page.
          </p>
        </div>
      </div>
    )
  }

  // Read ui_mode preference — userId maps to user_profiles.id
  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('ui_mode')
    .eq('id', userOrg.userId)
    .maybeSingle()
  const mode = resolveUiMode(profile?.ui_mode ?? null, userOrg.role as 'admin' | 'manager' | 'user')
  if (mode === 'advanced') redirect('/dashboard/crm/advanced')

  let data: Awaited<ReturnType<typeof loadEasyViewData>>
  try {
    data = await loadEasyViewData(userOrg.organizationId, userOrg.userId)
  } catch (err) {
    console.error('[crm/page] loadEasyViewData threw:', err)
    // Return safe fallback so the page renders instead of hitting the error boundary
    data = {
      followups: { items: [], totalCount: 0 },
      staleDeals: { items: [], totalCount: 0 },
      hotLeads: { items: [], totalCount: 0 },
      hasBrandVoice: false,
    }
  }

  const cards = [
    {
      id: 'followups',
      title: "Today's follow-ups",
      description: 'Contacts due for outreach',
      emptyStateCTA: 'Add your first contact',
      maxItems: 5 as const,
      sourceKind: 'cached_suggestions' as const,
    },
    {
      id: 'stale_deals',
      title: 'Stale deals',
      description: 'Deals stuck past stage threshold',
      emptyStateCTA: 'View all deals',
      maxItems: 5 as const,
      sourceKind: 'sql_page_load' as const,
    },
    {
      id: 'hot_leads',
      title: 'Hot leads',
      description: 'High-intent contacts to engage now',
      emptyStateCTA: 'Add your first deal',
      maxItems: 5 as const,
      sourceKind: 'cached_suggestions' as const,
    },
  ]

  return (
    <ModuleHome
      module="crm"
      cards={cards}
      cardData={{
        followups: data.followups,
        stale_deals: data.staleDeals,
        hot_leads: data.hotLeads,
      }}
      userRole={userOrg.role as 'admin' | 'manager' | 'user'}
      uiMode="easy"
      organizationId={userOrg.organizationId}
      hasBrandVoice={data.hasBrandVoice}
      apiEndpointBase="/api/crm/easy-view"
      advancedHref="/dashboard/crm/advanced"
    />
  )
}
