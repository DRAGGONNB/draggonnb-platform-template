import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { OnboardingChecklist } from '../_components/onboarding-checklist'
import {
  QuickActionCard,
  type QuickActionSuggestion,
} from './_components/quick-action-card'
import { TodaySummary, type SummaryTile } from './_components/today-summary'
import { RecentActivity, type ActivityRow } from './_components/recent-activity'

interface DashboardData {
  suggestion: QuickActionSuggestion | null
  tiles: SummaryTile[]
  activity: ActivityRow[]
  activeModules: string[]
}

async function loadDashboardData(organizationId: string): Promise<DashboardData> {
  const supabase = await createClient()
  const admin = createAdminClient()

  const tenantModulesPromise = admin
    .from('tenant_modules')
    .select('module_id, status')
    .eq('organization_id', organizationId)
    .eq('status', 'active')

  const suggestionPromise = supabase
    .from('dashboard_action_suggestions')
    .select('action_type, headline, body, cta_label, cta_href, refreshed_at')
    .eq('organization_id', organizationId)
    .maybeSingle()

  const contactsPromise = supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  const dealsPromise = supabase
    .from('deals')
    .select('value, stage')
    .eq('organization_id', organizationId)

  const crmActivitiesPromise = supabase
    .from('crm_activities')
    .select('id, kind, summary, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(10)

  const [
    tenantModulesResult,
    suggestionResult,
    contactsResult,
    dealsResult,
    crmActivitiesResult,
  ] = await Promise.allSettled([
    tenantModulesPromise,
    suggestionPromise,
    contactsPromise,
    dealsPromise,
    crmActivitiesPromise,
  ])

  const tenantModulesRows =
    tenantModulesResult.status === 'fulfilled' ? tenantModulesResult.value.data ?? [] : []
  const activeModules = tenantModulesRows.map((r) => r.module_id as string)

  const suggestion =
    suggestionResult.status === 'fulfilled' ? (suggestionResult.value.data as QuickActionSuggestion | null) ?? null : null

  const contactsCount =
    contactsResult.status === 'fulfilled' ? contactsResult.value.count ?? 0 : 0

  const dealsRows =
    dealsResult.status === 'fulfilled' ? (dealsResult.value.data ?? []) : []
  const activeDeals = dealsRows.filter((d) => !['won', 'lost'].includes(d.stage as string))
  const pipelineValue = activeDeals.reduce(
    (sum, d) => sum + (typeof d.value === 'number' ? d.value : 0),
    0,
  )

  const tiles: SummaryTile[] = []

  if (activeModules.includes('crm') || activeModules.length === 0) {
    tiles.push({
      id: 'contacts',
      label: 'Total Contacts',
      value: contactsCount.toLocaleString('en-ZA'),
      hint: 'In your CRM',
      icon: 'Users',
      tone: 'crimson',
    })
    tiles.push({
      id: 'pipeline',
      label: 'Active Deals',
      value: activeDeals.length.toLocaleString('en-ZA'),
      hint: `R${pipelineValue.toLocaleString('en-ZA')} pipeline`,
      icon: 'Briefcase',
      tone: 'emerald',
    })
  }

  if (activeModules.includes('accommodation')) {
    tiles.push({
      id: 'accommodation',
      label: 'Accommodation',
      value: 'Live',
      hint: 'Bookings & guest comms',
      icon: 'Hotel',
      tone: 'amber',
    })
  }
  if (activeModules.includes('restaurant')) {
    tiles.push({
      id: 'restaurant',
      label: 'Restaurant',
      value: 'Live',
      hint: 'POS & SOPs',
      icon: 'UtensilsCrossed',
      tone: 'amber',
    })
  }
  if (activeModules.includes('elijah') || activeModules.includes('security_ops')) {
    tiles.push({
      id: 'security',
      label: 'Security',
      value: 'Live',
      hint: 'Roll call & incidents',
      icon: 'Shield',
      tone: 'blue',
    })
  }
  if (
    activeModules.includes('email') ||
    activeModules.includes('campaigns') ||
    activeModules.length === 0
  ) {
    tiles.push({
      id: 'email',
      label: 'Email & Campaigns',
      value: 'Ready',
      hint: 'Drafts & sends',
      icon: 'Mail',
      tone: 'purple',
    })
  }

  const activityRows: ActivityRow[] =
    crmActivitiesResult.status === 'fulfilled'
      ? (crmActivitiesResult.value.data ?? []).map((a) => ({
          id: a.id as string,
          source: 'crm_activity' as const,
          description: (a.summary as string) ?? `CRM ${(a.kind as string) ?? 'activity'}`,
          occurred_at: a.created_at as string,
        }))
      : []

  return {
    suggestion,
    tiles: tiles.slice(0, 4),
    activity: activityRows,
    activeModules,
  }
}

export default async function DashboardPage() {
  const { data: userOrg, error } = await getUserOrg()

  if (error || !userOrg) {
    console.error('getUserOrg failed on dashboard:', error)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-800">Unable to load dashboard</h2>
          <p className="mt-2 text-sm text-red-600">
            {error === 'User not found' || error === 'No organization found for user'
              ? 'Your account setup is incomplete. Please contact support or try signing out and back in.'
              : 'There was a problem loading your account data. Please try refreshing the page.'}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <a
              href="/api/auth/signout"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Sign Out & Retry
            </a>
          </div>
        </div>
      </div>
    )
  }

  const data = await loadDashboardData(userOrg.organizationId)

  const today = new Date()
  const dateString = today.toLocaleDateString('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const firstName = userOrg.fullName?.split(' ')[0] || 'there'

  return (
    <div className="space-y-8">
      <OnboardingChecklist />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hi {firstName} — here&apos;s your day</h1>
        <p className="mt-1 text-sm text-gray-500">{dateString}</p>
      </div>

      <QuickActionCard suggestion={data.suggestion} />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Today&apos;s summary
        </h2>
        <TodaySummary tiles={data.tiles} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Recent activity
        </h2>
        <RecentActivity rows={data.activity} />
      </section>
    </div>
  )
}
