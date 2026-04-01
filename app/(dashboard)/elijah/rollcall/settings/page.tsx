'use client'

import { useEffect, useState } from 'react'
import { Settings, Plus, Clock, AlertTriangle, Users } from 'lucide-react'
import { ESCALATION_TIERS } from '@/lib/elijah/constants'
import { cn } from '@/lib/utils/cn'

interface Schedule {
  id: string
  time: string
  grace_period_minutes: number
  section: { name: string } | { name: string }[] | null
}

interface Section {
  id: string
  name: string
}

export default function RollCallSettingsPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formTime, setFormTime] = useState('18:00')
  const [formGrace, setFormGrace] = useState('15')
  const [formSection, setFormSection] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/elijah/rollcall/schedules').then(r => r.json()),
      fetch('/api/elijah/sections').then(r => r.json()),
    ])
      .then(([schedulesData, sectionsData]) => {
        setSchedules(schedulesData.schedules || [])
        setSections(sectionsData.sections || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleAddSchedule = async () => {
    const res = await fetch('/api/elijah/rollcall/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        time: formTime,
        grace_period_minutes: parseInt(formGrace),
        section_id: formSection || null,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setSchedules(prev => [...prev, data.schedule])
      setShowForm(false)
      setFormTime('18:00')
      setFormGrace('15')
      setFormSection('')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Roll Call Settings</h1>
        <p className="text-sm text-gray-500">Configure check-in schedules and escalation rules</p>
      </div>

      {/* Schedules */}
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Schedules</h2>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Schedule
          </button>
        </div>

        {/* Add schedule form */}
        {showForm && (
          <div className="mb-4 rounded-lg border border-dashed border-gray-300 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Time</label>
                <input
                  type="time"
                  value={formTime}
                  onChange={e => setFormTime(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Grace Period (minutes)</label>
                <input
                  type="number"
                  value={formGrace}
                  onChange={e => setFormGrace(e.target.value)}
                  min="5"
                  max="60"
                  className="w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Section</label>
                <select
                  value={formSection}
                  onChange={e => setFormSection(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  <option value="">All sections</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleAddSchedule}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Save Schedule
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {schedules.length === 0 ? (
          <p className="text-sm text-gray-500">No roll call schedules configured</p>
        ) : (
          <div className="space-y-2">
            {schedules.map(s => {
              const section = Array.isArray(s.section) ? s.section[0] : s.section
              return (
                <div key={s.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.time}</p>
                      <p className="text-xs text-gray-500">
                        {section?.name || 'All sections'} &middot; {s.grace_period_minutes}min grace period
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Escalation Tiers */}
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Escalation Tiers</h2>
        </div>
        <div className="space-y-2">
          {Object.entries(ESCALATION_TIERS).map(([tier, config]) => (
            <div key={tier} className="flex items-center gap-4 rounded-lg border px-4 py-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                {tier}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {config.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </p>
                <p className="text-xs text-gray-500">
                  {config.delay_minutes === 0 ? 'Immediately after grace period' : `+${config.delay_minutes} minutes`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Buddy Household Pairing */}
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Buddy Household Pairing</h2>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4">
          <Users className="h-5 w-5 text-gray-300" />
          <p className="text-sm text-gray-500">Buddy household pairing configuration will be available in a future update</p>
        </div>
      </div>
    </div>
  )
}
