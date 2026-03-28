import Link from 'next/link'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardStatCard } from '@/components/restaurant/dashboard/DashboardStatCard'

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5)
}

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
  const now = new Date().toTimeString().slice(0, 5)

  const [
    { count: openSessions },
    { count: todayReservations },
    { data: recentPayments },
    { data: upcomingReservations },
    { data: restaurants },
  ] = await Promise.all([
    admin
      .from('table_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userOrg.organizationId)
      .eq('status', 'open'),
    admin
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userOrg.organizationId)
      .eq('reservation_date', today),
    admin
      .from('bill_payments')
      .select('amount, tip, created_at')
      .eq('organization_id', userOrg.organizationId)
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('reservations')
      .select('id, reservation_time, party_size, status, contacts(first_name, last_name), restaurant_tables(label)')
      .eq('organization_id', userOrg.organizationId)
      .eq('reservation_date', today)
      .gte('reservation_time', now)
      .in('status', ['confirmed', 'pending'])
      .order('reservation_time', { ascending: true })
      .limit(3),
    admin
      .from('restaurants')
      .select('id, name')
      .eq('organization_id', userOrg.organizationId)
      .eq('is_active', true)
      .limit(1),
  ])

  const todayRevenue = (recentPayments ?? []).reduce(
    (sum, p) => sum + Number(p.amount) + Number(p.tip),
    0,
  )

  const restaurantId = restaurants?.[0]?.id ?? null

  return (
    <div className="min-h-screen bg-[#2D2F33] text-white">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Dashboard</h1>
            <span className="text-sm text-gray-400">{formatDate(new Date())}</span>
          </div>
          {restaurants?.[0] && (
            <p className="text-gray-400 text-sm mt-0.5">{restaurants[0].name}</p>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <DashboardStatCard
            label="Open Tables"
            value={openSessions ?? 0}
          />
          <DashboardStatCard
            label="Reservations Today"
            value={todayReservations ?? 0}
          />
          <DashboardStatCard
            label="Revenue Today"
            value={`R${todayRevenue.toFixed(0)}`}
            accent
          />
        </div>

        {/* Next reservations */}
        <div className="bg-[#1E2023] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Next Reservations
            </h2>
            <Link
              href="/restaurant/reservations"
              className="text-xs text-[#6B1420] hover:underline"
            >
              View all
            </Link>
          </div>
          {!upcomingReservations || upcomingReservations.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">
              No upcoming reservations today
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {upcomingReservations.map(r => {
                const contact = (r.contacts as unknown as { first_name: string; last_name: string } | null)
                const table = (r.restaurant_tables as unknown as { label: string } | null)
                const guestName = contact
                  ? `${contact.first_name} ${contact.last_name}`.trim()
                  : 'Walk-in'
                return (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-sm font-mono text-gray-300 w-12 shrink-0">
                      {formatTime(r.reservation_time)}
                    </span>
                    <span className="text-sm flex-1 truncate">{guestName}</span>
                    <span className="text-xs text-gray-500">x{r.party_size}</span>
                    <span className="text-xs text-gray-500">
                      {table?.label ?? 'Unassigned'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <Link
              href={restaurantId ? `/restaurant/tables?restaurant=${restaurantId}` : '/restaurant/tables'}
              className="bg-[#3A3C40] hover:bg-[#6B1420]/20 border border-white/10 hover:border-[#6B1420]/50 rounded-2xl p-4 text-center text-sm font-medium transition-colors"
            >
              Floor Plan
            </Link>
            <Link
              href="/restaurant/reservations"
              className="bg-[#3A3C40] hover:bg-[#6B1420]/20 border border-white/10 hover:border-[#6B1420]/50 rounded-2xl p-4 text-center text-sm font-medium transition-colors"
            >
              Reservations
            </Link>
            <Link
              href="/restaurant/compliance/temp-log"
              className="bg-[#3A3C40] hover:bg-[#6B1420]/20 border border-white/10 hover:border-[#6B1420]/50 rounded-2xl p-4 text-center text-sm font-medium transition-colors"
            >
              Temp Log
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
