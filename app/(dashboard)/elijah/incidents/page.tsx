'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Plus, Filter } from 'lucide-react'
import { SEVERITY_COLORS, INCIDENT_STATUS_COLORS, INCIDENT_TYPE_LABELS } from '@/lib/elijah/constants'
import { cn } from '@/lib/utils/cn'

interface Incident {
  id: string
  type: string
  severity: string
  status: string
  description: string
  created_at: string
  reporter?: { display_name: string } | { display_name: string }[]
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/elijah/incidents?${params}`)
      const data = await res.json()
      setIncidents(data.incidents || [])
      setLoading(false)
    }
    load()
  }, [statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
          <p className="text-sm text-gray-500">Manage community incidents and responses</p>
        </div>
        <Link
          href="/elijah/incidents/new"
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          <Plus className="h-4 w-4" />
          Report Incident
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        {['', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
        </div>
      ) : incidents.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">No incidents found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {incidents.map(inc => {
            const reporter = Array.isArray(inc.reporter) ? inc.reporter[0] : inc.reporter
            return (
              <Link
                key={inc.id}
                href={`/elijah/incidents/${inc.id}`}
                className="flex items-center gap-4 rounded-xl border bg-white p-4 transition-colors hover:bg-gray-50"
              >
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', SEVERITY_COLORS[inc.severity as keyof typeof SEVERITY_COLORS])}>
                  {inc.severity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{inc.description}</p>
                  <p className="text-xs text-gray-500">
                    {INCIDENT_TYPE_LABELS[inc.type] || inc.type} &middot; Reported by {reporter?.display_name || 'Unknown'} &middot;{' '}
                    {new Date(inc.created_at).toLocaleString('en-ZA')}
                  </p>
                </div>
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', INCIDENT_STATUS_COLORS[inc.status as keyof typeof INCIDENT_STATUS_COLORS])}>
                  {inc.status.replace('_', ' ')}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
