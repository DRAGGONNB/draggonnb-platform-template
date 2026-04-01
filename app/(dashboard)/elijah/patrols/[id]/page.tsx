'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Shield, Clock, MapPin, Users, CheckSquare, LogIn, LogOut } from 'lucide-react'
import { PATROL_STATUS_COLORS } from '@/lib/elijah/constants'
import { cn } from '@/lib/utils/cn'

interface PatrolDetail {
  id: string
  scheduled_date: string
  status: string
  start_time: string | null
  end_time: string | null
  section: { name: string } | { name: string }[] | null
  assignments: {
    id: string
    member: { display_name: string } | { display_name: string }[] | null
  }[]
  checkins: {
    id: string
    type: string
    checked_at: string
    member: { display_name: string } | { display_name: string }[] | null
  }[]
}

export default function PatrolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [patrol, setPatrol] = useState<PatrolDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/elijah/patrols/${id}`)
      .then(r => r.json())
      .then(d => { setPatrol(d.patrol || null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
      </div>
    )
  }

  if (!patrol) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="rounded-xl border bg-white p-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">Patrol not found</p>
        </div>
      </div>
    )
  }

  const section = Array.isArray(patrol.section) ? patrol.section[0] : patrol.section

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patrol Detail</h1>
          <p className="text-sm text-gray-500">{patrol.scheduled_date}</p>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-xs font-medium', PATROL_STATUS_COLORS[patrol.status as keyof typeof PATROL_STATUS_COLORS])}>
          {patrol.status}
        </span>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border bg-white p-4">
          <MapPin className="h-5 w-5 text-gray-400" />
          <div>
            <p className="text-xs font-medium text-gray-500">Section</p>
            <p className="text-sm font-medium text-gray-900">{section?.name || 'All sections'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-white p-4">
          <Clock className="h-5 w-5 text-gray-400" />
          <div>
            <p className="text-xs font-medium text-gray-500">Start Time</p>
            <p className="text-sm font-medium text-gray-900">{patrol.start_time || 'Not set'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-white p-4">
          <Clock className="h-5 w-5 text-gray-400" />
          <div>
            <p className="text-xs font-medium text-gray-500">End Time</p>
            <p className="text-sm font-medium text-gray-900">{patrol.end_time || 'Not set'}</p>
          </div>
        </div>
      </div>

      {/* Assigned Members */}
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Assigned Members</h2>
        </div>
        {patrol.assignments.length === 0 ? (
          <p className="text-sm text-gray-500">No members assigned to this patrol</p>
        ) : (
          <div className="space-y-2">
            {patrol.assignments.map(a => {
              const member = Array.isArray(a.member) ? a.member[0] : a.member
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border px-4 py-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                    {(member?.display_name || '?')[0].toUpperCase()}
                  </div>
                  <p className="text-sm font-medium text-gray-900">{member?.display_name || 'Unknown'}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Check-in/out Log */}
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-3 mb-4">
          <LogIn className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Check-in / Check-out Log</h2>
        </div>
        {patrol.checkins.length === 0 ? (
          <p className="text-sm text-gray-500">No check-ins recorded yet</p>
        ) : (
          <div className="space-y-2">
            {patrol.checkins.map(c => {
              const member = Array.isArray(c.member) ? c.member[0] : c.member
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border px-4 py-2">
                  {c.type === 'check_in' ? (
                    <LogIn className="h-4 w-4 text-green-600" />
                  ) : (
                    <LogOut className="h-4 w-4 text-orange-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{member?.display_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{c.type.replace('_', ' ')} at {new Date(c.checked_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Checklist placeholder */}
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-3 mb-4">
          <CheckSquare className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Checklist</h2>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4">
          <CheckSquare className="h-5 w-5 text-gray-300" />
          <p className="text-sm text-gray-500">Patrol checklists will be available in a future update</p>
        </div>
      </div>
    </div>
  )
}
