'use client'

import { useEffect, useState } from 'react'
import { ClipboardCheck, CheckCircle, AlertCircle, Clock, Plane } from 'lucide-react'
import { CHECKIN_STATUS_COLORS } from '@/lib/elijah/constants'
import { cn } from '@/lib/utils/cn'

interface HouseholdStatus {
  household_id: string
  address: string
  unit_number: string | null
  section_id: string | null
  status: string
  checked_at: string | null
}

interface Summary {
  total: number
  safe: number
  help: number
  away: number
  pending: number
  missed: number
}

export default function RollCallPage() {
  const [households, setHouseholds] = useState<HouseholdStatus[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, safe: 0, help: 0, away: 0, pending: 0, missed: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/elijah/rollcall/status')
      .then(r => r.json())
      .then(d => {
        setHouseholds(d.households || [])
        setSummary(d.summary || { total: 0, safe: 0, help: 0, away: 0, pending: 0, missed: 0 })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const statusIcon = (status: string) => {
    switch (status) {
      case 'safe': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'help': return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'away': return <Plane className="h-4 w-4 text-blue-600" />
      default: return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roll Call</h1>
          <p className="text-sm text-gray-500">Today&apos;s household check-in status</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryCard label="Total" value={summary.total} color="bg-gray-100 text-gray-700" />
        <SummaryCard label="Safe" value={summary.safe} color="bg-green-100 text-green-700" />
        <SummaryCard label="Help" value={summary.help} color="bg-red-100 text-red-700" />
        <SummaryCard label="Away" value={summary.away} color="bg-blue-100 text-blue-700" />
        <SummaryCard label="Pending" value={summary.pending} color="bg-yellow-100 text-yellow-700" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {households.map(h => (
            <div key={h.household_id} className={cn('flex items-center gap-3 rounded-lg border bg-white p-3', h.status === 'help' && 'border-red-300 bg-red-50')}>
              {statusIcon(h.status)}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {h.address}{h.unit_number ? ` #${h.unit_number}` : ''}
                </p>
                <p className="text-xs text-gray-500">
                  {h.checked_at ? new Date(h.checked_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : 'Not checked in'}
                </p>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', CHECKIN_STATUS_COLORS[h.status as keyof typeof CHECKIN_STATUS_COLORS])}>
                {h.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={cn('rounded-lg p-3 text-center', color)}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium">{label}</p>
    </div>
  )
}
