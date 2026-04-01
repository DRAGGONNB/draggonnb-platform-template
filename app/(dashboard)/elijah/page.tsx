'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Shield, AlertTriangle, Flame, ClipboardCheck, Radio, ArrowRight } from 'lucide-react'
import { SEVERITY_COLORS, INCIDENT_STATUS_COLORS, INCIDENT_TYPE_LABELS, FIRE_STATUS_COLORS } from '@/lib/elijah/constants'
import { cn } from '@/lib/utils/cn'

interface DashboardStats {
  active_incidents: Record<string, unknown>[]
  active_incidents_count: number
  active_fires: Record<string, unknown>[]
  active_fires_count: number
  rollcall: { total: number; safe: number; help: number; away: number; pending: number }
  active_patrols: Record<string, unknown>[]
  active_patrols_count: number
}

export default function ElijahDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/elijah/dashboard/stats')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const rollcall = stats?.rollcall || { total: 0, safe: 0, help: 0, away: 0, pending: 0 }
  const checkedIn = rollcall.safe + rollcall.away
  const rollcallLabel = rollcall.total > 0 ? `${checkedIn}/${rollcall.total}` : '--'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Elijah - Security & Response</h1>
          <p className="mt-1 text-sm text-gray-500">Community safety dashboard</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
          <Radio className="h-3 w-3" />
          System Active
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          label="Active Incidents"
          value={loading ? '--' : String(stats?.active_incidents_count || 0)}
          sublabel={loading ? 'Loading...' : stats?.active_incidents_count ? 'Requires attention' : 'All clear'}
          bgColor="bg-red-50"
        />
        <StatCard
          icon={<Flame className="h-5 w-5 text-orange-600" />}
          label="Active Fires"
          value={loading ? '--' : String(stats?.active_fires_count || 0)}
          sublabel={loading ? 'Loading...' : stats?.active_fires_count ? 'Response active' : 'No active fires'}
          bgColor="bg-orange-50"
        />
        <StatCard
          icon={<ClipboardCheck className="h-5 w-5 text-green-600" />}
          label="Roll Call"
          value={loading ? '--' : rollcallLabel}
          sublabel={loading ? 'Loading...' : rollcall.help > 0 ? `${rollcall.help} need help!` : `${rollcall.pending} pending`}
          bgColor="bg-green-50"
        />
        <StatCard
          icon={<Shield className="h-5 w-5 text-blue-600" />}
          label="Patrols Active"
          value={loading ? '--' : String(stats?.active_patrols_count || 0)}
          sublabel={loading ? 'Loading...' : 'Currently patrolling'}
          bgColor="bg-blue-50"
        />
      </div>

      {/* Widget Panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active Incidents */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Active Incidents</h3>
            <Link href="/elijah/incidents" className="text-xs text-red-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y">
            {loading ? (
              <div className="flex justify-center p-6"><div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" /></div>
            ) : (stats?.active_incidents || []).length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-400">No active incidents</p>
            ) : (
              (stats?.active_incidents || []).slice(0, 5).map(inc => {
                const reporter = Array.isArray(inc.reporter) ? (inc.reporter as Record<string, string>[])[0] : inc.reporter as Record<string, string> | null
                return (
                  <Link key={inc.id as string} href={`/elijah/incidents/${inc.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                    <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold uppercase', SEVERITY_COLORS[inc.severity as keyof typeof SEVERITY_COLORS])}>
                      {inc.severity as string}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-900">{inc.description as string}</p>
                      <p className="text-xs text-gray-400">{INCIDENT_TYPE_LABELS[inc.type as string]} &middot; {reporter?.display_name}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300" />
                  </Link>
                )
              })
            )}
          </div>
        </div>

        {/* Roll Call Status */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Roll Call Status</h3>
            <Link href="/elijah/rollcall" className="text-xs text-red-600 hover:underline">View details</Link>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="flex justify-center p-6"><div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" /></div>
            ) : rollcall.total === 0 ? (
              <p className="text-center text-sm text-gray-400">No households registered</p>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 rounded-lg bg-green-50 p-3 text-center">
                    <p className="text-lg font-bold text-green-700">{rollcall.safe}</p>
                    <p className="text-[10px] font-medium text-green-600">SAFE</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-red-50 p-3 text-center">
                    <p className="text-lg font-bold text-red-700">{rollcall.help}</p>
                    <p className="text-[10px] font-medium text-red-600">HELP</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-blue-50 p-3 text-center">
                    <p className="text-lg font-bold text-blue-700">{rollcall.away}</p>
                    <p className="text-[10px] font-medium text-blue-600">AWAY</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-yellow-50 p-3 text-center">
                    <p className="text-lg font-bold text-yellow-700">{rollcall.pending}</p>
                    <p className="text-[10px] font-medium text-yellow-600">PENDING</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${rollcall.total > 0 ? (checkedIn / rollcall.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Fires */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Active Fires</h3>
            <Link href="/elijah/fire" className="text-xs text-red-600 hover:underline">Fire Ops</Link>
          </div>
          <div className="divide-y">
            {loading ? (
              <div className="flex justify-center p-6"><div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" /></div>
            ) : (stats?.active_fires || []).length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-400">No active fire incidents</p>
            ) : (
              (stats?.active_fires || []).map(f => (
                <div key={f.id as string} className="flex items-center gap-3 px-5 py-3">
                  <Flame className="h-4 w-4 text-red-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900">{f.fire_type as string}{f.wind_direction ? ` - Wind: ${f.wind_direction}` : ''}</p>
                  </div>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', FIRE_STATUS_COLORS[f.status as keyof typeof FIRE_STATUS_COLORS])}>
                    {(f.status as string).toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Patrols */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Patrols In Progress</h3>
            <Link href="/elijah/patrols" className="text-xs text-red-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y">
            {loading ? (
              <div className="flex justify-center p-6"><div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" /></div>
            ) : (stats?.active_patrols || []).length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-400">No patrols in progress</p>
            ) : (
              (stats?.active_patrols || []).map(p => {
                const section = Array.isArray(p.section) ? (p.section as Record<string, string>[])[0] : p.section as Record<string, string> | null
                return (
                  <div key={p.id as string} className="flex items-center gap-3 px-5 py-3">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900">{section?.name || 'All sections'}</p>
                      <p className="text-xs text-gray-400">{p.scheduled_date as string}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sublabel, bgColor }: {
  icon: React.ReactNode; label: string; value: string; sublabel: string; bgColor: string
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn('rounded-lg p-2', bgColor)}>{icon}</div>
        <div>
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-400">{sublabel}</p>
        </div>
      </div>
    </div>
  )
}
