'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

const INCIDENT_TYPES = [
  { value: 'break_in', label: 'Break-in' },
  { value: 'fire', label: 'Fire' },
  { value: 'medical', label: 'Medical Emergency' },
  { value: 'suspicious_activity', label: 'Suspicious Activity' },
  { value: 'noise', label: 'Noise Complaint' },
  { value: 'infrastructure', label: 'Infrastructure Issue' },
  { value: 'other', label: 'Other' },
]

const SEVERITIES = [
  { value: 'critical', label: 'Critical', color: 'bg-red-600' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-blue-500' },
]

export default function NewIncidentPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const body = {
      type: form.get('type'),
      severity: form.get('severity'),
      description: form.get('description'),
    }

    const res = await fetch('/api/elijah/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to create incident')
      setSubmitting(false)
      return
    }

    const data = await res.json()
    router.push(`/elijah/incidents/${data.incident.id}`)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Report Incident</h1>
        <p className="text-sm text-gray-500">Create a new incident report for your community</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border bg-white p-6">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Incident Type</label>
          <select name="type" required className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500">
            <option value="">Select type...</option>
            {INCIDENT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Severity</label>
          <div className="mt-2 flex gap-3">
            {SEVERITIES.map(s => (
              <label key={s.value} className="flex items-center gap-2">
                <input type="radio" name="severity" value={s.value} defaultChecked={s.value === 'medium'} className="text-red-600 focus:ring-red-500" />
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${s.color}`}>{s.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            required
            rows={4}
            placeholder="Describe the incident in detail..."
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <AlertTriangle className="h-4 w-4" />
            {submitting ? 'Reporting...' : 'Report Incident'}
          </button>
        </div>
      </form>
    </div>
  )
}
