'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Clock, User, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { SEVERITY_COLORS, INCIDENT_STATUS_COLORS, INCIDENT_TYPE_LABELS } from '@/lib/elijah/constants'
import { cn } from '@/lib/utils/cn'

export default function IncidentDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [incident, setIncident] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')

  useEffect(() => {
    fetch(`/api/elijah/incidents/${id}`)
      .then(r => r.json())
      .then(d => { setIncident(d.incident); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  async function updateStatus(status: string) {
    await fetch(`/api/elijah/incidents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    // Reload
    const res = await fetch(`/api/elijah/incidents/${id}`)
    const data = await res.json()
    setIncident(data.incident)
  }

  async function addNote() {
    if (!newNote.trim()) return
    await fetch(`/api/elijah/incidents/${id}/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'note', notes: newNote }),
    })
    setNewNote('')
    const res = await fetch(`/api/elijah/incidents/${id}`)
    const data = await res.json()
    setIncident(data.incident)
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" /></div>
  }

  if (!incident) {
    return <div className="rounded-lg border bg-white p-8 text-center text-sm text-gray-500">Incident not found</div>
  }

  const reporter = Array.isArray(incident.reporter) ? (incident.reporter as Record<string, string>[])[0] : incident.reporter as Record<string, string> | null
  const timeline = (incident.timeline as Record<string, unknown>[] || [])
  const assignments = (incident.assignments as Record<string, unknown>[] || [])
  const status = incident.status as string
  const severity = incident.severity as string
  const type = incident.type as string

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-lg p-1 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{INCIDENT_TYPE_LABELS[type] || type}</h1>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS])}>
              {severity}
            </span>
            <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', INCIDENT_STATUS_COLORS[status as keyof typeof INCIDENT_STATUS_COLORS])}>
              {status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Reported by {reporter?.display_name || 'Unknown'} &middot; {new Date(incident.created_at as string).toLocaleString('en-ZA')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          <div className="rounded-xl border bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900">Description</h3>
            <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{incident.description as string}</p>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Timeline</h3>
            <div className="space-y-3">
              {timeline.map((event: Record<string, unknown>) => {
                const actor = Array.isArray(event.actor) ? (event.actor as Record<string, string>[])[0] : event.actor as Record<string, string> | null
                return (
                  <div key={event.id as string} className="flex gap-3">
                    <div className="mt-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">{event.notes as string}</p>
                      <p className="text-xs text-gray-400">
                        {actor?.display_name || 'System'} &middot; {new Date(event.created_at as string).toLocaleString('en-ZA')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Add note */}
            <div className="mt-4 flex gap-2">
              <input
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 rounded-lg border px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                onKeyDown={e => e.key === 'Enter' && addNote()}
              />
              <button onClick={addNote} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800">
                <MessageSquare className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status actions */}
          <div className="rounded-xl border bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Actions</h3>
            <div className="space-y-2">
              {status === 'open' && (
                <button onClick={() => updateStatus('in_progress')} className="w-full rounded-lg bg-yellow-500 px-3 py-2 text-sm font-medium text-white hover:bg-yellow-600">
                  Start Working
                </button>
              )}
              {(status === 'open' || status === 'in_progress') && (
                <button onClick={() => updateStatus('resolved')} className="w-full rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700">
                  Mark Resolved
                </button>
              )}
              {status === 'resolved' && (
                <button onClick={() => updateStatus('closed')} className="w-full rounded-lg bg-gray-600 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700">
                  Close Incident
                </button>
              )}
            </div>
          </div>

          {/* Assigned members */}
          <div className="rounded-xl border bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Assigned ({assignments.length})</h3>
            {assignments.length === 0 ? (
              <p className="text-xs text-gray-400">No one assigned yet</p>
            ) : (
              <div className="space-y-2">
                {assignments.map((a: Record<string, unknown>) => {
                  const member = Array.isArray(a.member) ? (a.member as Record<string, string>[])[0] : a.member as Record<string, string> | null
                  return (
                    <div key={a.id as string} className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{member?.display_name || 'Unknown'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
