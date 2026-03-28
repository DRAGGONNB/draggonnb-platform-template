import { getUserOrg } from '@/lib/auth/get-user-org'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function RestaurantDashboardPage() {
  const { data: userOrg, error } = await getUserOrg()

  if (error || !userOrg) {
    return (
      <div className="p-6 text-red-400">
        Unable to load dashboard: {error}
      </div>
    )
  }

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { data: restaurants },
    { count: openSessions },
    { count: todayReservations },
    { data: recentPayments },
  ] = await Promise.all([
    admin.from('restaurants').select('id, name, slug, is_active').eq('organization_id', userOrg.organizationId),
    admin.from('table_sessions').select('*', { count: 'exact', head: true }).eq('organization_id', userOrg.organizationId).eq('status', 'open'),
    admin.from('reservations').select('*', { count: 'exact', head: true }).eq('organization_id', userOrg.organizationId).eq('reservation_date', today),
    admin.from('bill_payments').select('amount, tip, created_at').eq('organization_id', userOrg.organizationId).gte('created_at', `${today}T00:00:00`).order('created_at', { ascending: false }).limit(10),
  ])

  const todayRevenue = (recentPayments ?? []).reduce((sum, p) => sum + Number(p.amount) + Number(p.tip), 0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Restaurant Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">{new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Open Tables" value={String(openSessions ?? 0)} color="green" />
        <StatCard label="Today&apos;s Reservations" value={String(todayReservations ?? 0)} color="blue" />
        <StatCard label="Today&apos;s Revenue" value={`R${todayRevenue.toFixed(2)}`} color="burgundy" />
        <StatCard label="Restaurants" value={String(restaurants?.length ?? 0)} color="gray" />
      </div>

      {/* Restaurants */}
      <div className="bg-[#3A3C40] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-semibold">Your Restaurants</h2>
          <a href="/restaurant/settings/new" className="text-sm text-[#6B1420] hover:underline">+ Add Restaurant</a>
        </div>
        {!restaurants || restaurants.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 mb-4">No restaurants configured yet.</p>
            <a href="/restaurant/settings/new" className="btn-brand text-sm px-4 py-2 rounded-lg">Set Up Your Restaurant</a>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {restaurants.map(r => (
              <div key={r.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium">{r.name}</p>
                  {r.slug && <p className="text-xs text-gray-500">/r/{r.slug}/...</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.is_active ? 'bg-green-900/40 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
                    {r.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <a href={`/restaurant/tables?restaurant=${r.id}`} className="text-sm text-gray-400 hover:text-white">Floor Plan →</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    burgundy: 'text-[#6B1420]',
    gray: 'text-gray-300',
  }
  return (
    <div className="bg-[#3A3C40] rounded-2xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color as keyof typeof colors] ?? 'text-white'}`}>{value}</p>
    </div>
  )
}
