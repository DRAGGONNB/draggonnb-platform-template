'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RESTAURANT_ID, formatZAR } from '@/lib/restaurant/constants'
import {
  Loader2,
  UtensilsCrossed,
  Users,
  Receipt,
  TrendingUp,
  Clock,
  CalendarCheck,
  AlertTriangle,
} from 'lucide-react'

interface DashboardStats {
  totalTables: number
  occupiedTables: number
  openBills: number
  todayRevenue: number
  todayCovers: number
  todayReservations: number
  pendingSOPs: number
  avgTurnTime: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]

      // Parallel queries
      const [tablesRes, sessionsRes, billsRes, reservationsRes, sopsRes] = await Promise.all([
        supabase.from('restaurant_tables').select('id', { count: 'exact', head: true }).eq('restaurant_id', RESTAURANT_ID),
        supabase.from('table_sessions').select('id, party_size, opened_at, closed_at, status').eq('restaurant_id', RESTAURANT_ID).gte('opened_at', today + 'T00:00:00'),
        supabase.from('bills').select('id, total, status').eq('restaurant_id', RESTAURANT_ID).gte('created_at', today + 'T00:00:00'),
        supabase.from('restaurant_reservations').select('id', { count: 'exact', head: true }).eq('restaurant_id', RESTAURANT_ID).eq('reservation_date', today),
        supabase.from('restaurant_sop_instances').select('id', { count: 'exact', head: true }).eq('restaurant_id', RESTAURANT_ID).eq('shift_date', today).neq('status', 'completed'),
      ])

      const sessions = sessionsRes.data ?? []
      const bills = billsRes.data ?? []
      const openSessions = sessions.filter((s: { status: string }) => s.status === 'open')

      const closedSessions = sessions.filter((s: { closed_at: string | null }) => s.closed_at)
      const avgTurn = closedSessions.length > 0
        ? closedSessions.reduce((sum: number, s: { opened_at: string; closed_at: string | null }) => {
            return sum + (new Date(s.closed_at!).getTime() - new Date(s.opened_at).getTime()) / 60000
          }, 0) / closedSessions.length
        : 0

      setStats({
        totalTables: tablesRes.count ?? 0,
        occupiedTables: openSessions.length,
        openBills: bills.filter((b: { status: string }) => b.status === 'open').length,
        todayRevenue: bills.filter((b: { status: string }) => b.status !== 'open').reduce((sum: number, b: { total: number }) => sum + Number(b.total), 0),
        todayCovers: sessions.reduce((sum: number, s: { party_size: number }) => sum + s.party_size, 0),
        todayReservations: reservationsRes.count ?? 0,
        pendingSOPs: sopsRes.count ?? 0,
        avgTurnTime: Math.round(avgTurn),
      })
    } catch {
      // Silent fail - dashboard still renders
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0077B6]" />
      </div>
    )
  }

  const s = stats ?? {
    totalTables: 0, occupiedTables: 0, openBills: 0, todayRevenue: 0,
    todayCovers: 0, todayReservations: 0, pendingSOPs: 0, avgTurnTime: 0,
  }

  const occupancyPct = s.totalTables > 0 ? Math.round((s.occupiedTables / s.totalTables) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Today&apos;s overview</p>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={UtensilsCrossed} label="Occupancy" value={`${occupancyPct}%`} sub={`${s.occupiedTables}/${s.totalTables} tables`} color="text-[#0077B6]" bg="bg-[#0077B6]/10" />
        <StatCard icon={TrendingUp} label="Revenue" value={formatZAR(s.todayRevenue)} sub="Today" color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard icon={Users} label="Covers" value={String(s.todayCovers)} sub="Guests served" color="text-purple-600" bg="bg-purple-50" />
        <StatCard icon={Receipt} label="Open Bills" value={String(s.openBills)} sub="Active" color="text-amber-600" bg="bg-amber-50" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarCheck} label="Reservations" value={String(s.todayReservations)} sub="Today" color="text-blue-600" bg="bg-blue-50" />
        <StatCard icon={Clock} label="Avg Turn" value={s.avgTurnTime > 0 ? `${s.avgTurnTime}m` : '--'} sub="Table time" color="text-gray-600" bg="bg-gray-100" />
        <StatCard icon={AlertTriangle} label="Pending SOPs" value={String(s.pendingSOPs)} sub="Incomplete" color={s.pendingSOPs > 0 ? 'text-red-600' : 'text-gray-600'} bg={s.pendingSOPs > 0 ? 'bg-red-50' : 'bg-gray-100'} />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { href: '/restaurant/tables', label: 'Manage Tables', icon: UtensilsCrossed },
          { href: '/restaurant/bills', label: 'View Bills', icon: Receipt },
          { href: '/restaurant/reservations', label: 'Reservations', icon: CalendarCheck },
          { href: '/restaurant/sops', label: 'SOPs & Checklists', icon: AlertTriangle },
          { href: '/restaurant/staff', label: 'Staff', icon: Users },
          { href: '/restaurant/qr-codes', label: 'QR Codes', icon: TrendingUp },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm hover:border-gray-300 transition-all"
          >
            <link.icon className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">{link.label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  bg,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub: string
  color: string
  bg: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg}`}>
          <Icon className={`w-4.5 h-4.5 ${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      <p className="text-[10px] text-gray-400">{sub}</p>
    </div>
  )
}
