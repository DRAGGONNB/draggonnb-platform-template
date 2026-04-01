'use client'

import { useEffect, useState } from 'react'
import { Shield, Plus } from 'lucide-react'
import { PATROL_STATUS_COLORS } from '@/lib/elijah/constants'
import { cn } from '@/lib/utils/cn'

export default function PatrolsPage() {
  const [patrols, setPatrols] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/elijah/patrols')
      .then(r => r.json())
      .then(d => { setPatrols(d.patrols || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patrols</h1>
          <p className="text-sm text-gray-500">Schedule and track community patrols</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          <Plus className="h-4 w-4" />
          Schedule Patrol
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
        </div>
      ) : patrols.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">No patrols scheduled</p>
        </div>
      ) : (
        <div className="space-y-2">
          {patrols.map(p => {
            const section = Array.isArray(p.section) ? (p.section as Record<string, string>[])[0] : p.section as Record<string, string> | null
            const assignments = (p.assignments as Record<string, unknown>[]) || []
            return (
              <div key={p.id as string} className="flex items-center gap-4 rounded-xl border bg-white p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {section?.name || 'All sections'} &middot; {p.scheduled_date as string}
                  </p>
                  <p className="text-xs text-gray-500">
                    {p.start_time ? `${p.start_time} - ${p.end_time || '?'}` : 'No time set'}
                    {assignments.length > 0 && ` &middot; ${assignments.length} assigned`}
                  </p>
                </div>
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', PATROL_STATUS_COLORS[p.status as keyof typeof PATROL_STATUS_COLORS])}>
                  {p.status as string}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
