import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { redirect } from 'next/navigation'

async function getCRMStats(organizationId: string) {
  const supabase = await createClient()

  // Fetch contacts count
  const { count: contactsCount } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  // Fetch deals count and value
  const { data: deals } = await supabase
    .from('deals')
    .select('value, stage')
    .eq('organization_id', organizationId)

  const activeDeals = deals?.filter(d => !['won', 'lost'].includes(d.stage)) || []
  const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0)

  // Fetch companies count
  const { count: companiesCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  // Get recent contacts (last 7 days)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const { count: recentContacts } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('created_at', weekAgo.toISOString())

  return {
    contacts: contactsCount || 0,
    deals: activeDeals.length,
    companies: companiesCount || 0,
    pipelineValue,
    recentContacts: recentContacts || 0
  }
}

export default async function CRMPage() {
  // Get user and organization with auth check
  const { data: userOrg, error } = await getUserOrg()

  if (error || !userOrg) {
    redirect('/login')
  }

  // Fetch real stats
  const stats = await getCRMStats(userOrg.organizationId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CRM Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your contacts, deals, and companies</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/crm/contacts">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-semibold mb-2">Contacts</h3>
            <p className="text-gray-600 text-sm">Manage your contact database</p>
            <div className="mt-4 text-blue-600 font-medium text-sm group-hover:underline">View Contacts →</div>
          </Card>
        </Link>

        <Link href="/crm/deals">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="text-4xl mb-4">💼</div>
            <h3 className="text-xl font-semibold mb-2">Deals</h3>
            <p className="text-gray-600 text-sm">Track your sales pipeline</p>
            <div className="mt-4 text-blue-600 font-medium text-sm group-hover:underline">View Deals →</div>
          </Card>
        </Link>

        <Link href="/crm/companies">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="text-4xl mb-4">🏢</div>
            <h3 className="text-xl font-semibold mb-2">Companies</h3>
            <p className="text-gray-600 text-sm">Manage company accounts</p>
            <div className="mt-4 text-blue-600 font-medium text-sm group-hover:underline">View Companies →</div>
          </Card>
        </Link>
      </div>

      {/* Quick Stats - Now with real data */}
      <div className="grid gap-4 md:grid-cols-3 mt-8">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total Contacts</div>
          <div className="text-2xl font-bold mt-1">{stats.contacts}</div>
          {stats.recentContacts > 0 && (
            <div className="text-xs text-green-600 mt-1">+{stats.recentContacts} this week</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Active Deals</div>
          <div className="text-2xl font-bold mt-1">{stats.deals}</div>
          <div className="text-xs text-blue-600 mt-1">R{stats.pipelineValue.toLocaleString()} pipeline</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Companies</div>
          <div className="text-2xl font-bold mt-1">{stats.companies}</div>
        </Card>
      </div>
    </div>
  )
}
