'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flame, Droplets, Map, Plus } from 'lucide-react'
import { FIRE_STATUS_COLORS, FIRE_TYPE_LABELS } from '@/lib/elijah/constants'
import { cn } from '@/lib/utils/cn'

export default function FireDashboardPage() {
  const [fireIncidents, setFireIncidents] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/elijah/fire/incidents')
      .then(r => r.json())
      .then(d => { setFireIncidents(d.fire_incidents || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const active = fireIncidents.filter(f => ['reported', 'active', 'contained'].includes(f.status as string))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fire Operations</h1>
          <p className="text-sm text-gray-500">{active.length} active fire incident{active.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/elijah/fire/map" className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Map className="h-4 w-4" />
            Open Map
          </Link>
          <Link href="/elijah/incidents/new" className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            <Flame className="h-4 w-4" />
            Report Fire
          </Link>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink href="/elijah/fire/water-points" icon={<Droplets className="h-5 w-5 text-blue-600" />} label="Water Points" />
        <QuickLink href="/elijah/fire/farms" label="Farms" icon={<span className="text-lg">🌾</span>} />
        <QuickLink href="/elijah/fire/groups" label="Responder Groups" icon={<span className="text-lg">👥</span>} />
        <QuickLink href="/elijah/fire/equipment" label="Equipment" icon={<span className="text-lg">🚒</span>} />
      </div>

      {/* Active fire incidents */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
        </div>
      ) : active.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <Flame className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">No active fire incidents</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map(f => {
            const incident = Array.isArray(f.incident) ? (f.incident as Record<string, unknown>[])[0] : f.incident as Record<string, unknown> | null
            const dispatches = (f.dispatches as Record<string, unknown>[]) || []
            return (
              <div key={f.id as string} className="rounded-xl border border-red-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Flame className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {FIRE_TYPE_LABELS[f.fire_type as string] || f.fire_type as string}
                        {f.wind_direction ? <span className="ml-2 text-sm text-gray-500">Wind: {f.wind_direction as string}</span> : null}
                      </p>
                      <p className="text-xs text-gray-500">{(incident?.description as string) || 'No description'}</p>
                    </div>
                  </div>
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', FIRE_STATUS_COLORS[f.status as keyof typeof FIRE_STATUS_COLORS])}>
                    {(f.status as string).toUpperCase()}
                  </span>
                </div>
                {dispatches.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dispatches.map((d: Record<string, unknown>) => {
                      const group = Array.isArray(d.group) ? (d.group as Record<string, string>[])[0] : d.group as Record<string, string> | null
                      return (
                        <span key={d.id as string} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {group?.name || 'Unknown group'}
                          {d.arrived_at ? ' (on scene)' : ' (dispatched)'}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg border bg-white p-4 transition-colors hover:bg-gray-50">
      {icon}
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </Link>
  )
}
