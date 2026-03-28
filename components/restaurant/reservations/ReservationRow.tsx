'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ReservationStatus } from '@/lib/restaurant/types'

interface ReservationRowProps {
  reservation: {
    id: string
    reservation_time: string
    party_size: number
    status: ReservationStatus
    whatsapp_number?: string | null
    special_requests?: string | null
    contacts?: { first_name: string; last_name: string } | null
    restaurant_tables?: { label: string } | null
  }
  onStatusChange: (id: string, status: ReservationStatus) => void
}

const STATUS_COLORS: Record<ReservationStatus, string> = {
  confirmed: 'bg-green-900/40 text-green-400',
  pending: 'bg-amber-900/40 text-amber-400',
  seated: 'bg-blue-900/40 text-blue-400',
  no_show: 'bg-red-900/40 text-red-400',
  cancelled: 'bg-gray-700 text-gray-500',
  completed: 'bg-gray-700 text-gray-400',
}

const STATUS_LABELS: Record<ReservationStatus, string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  seated: 'Seated',
  no_show: 'No Show',
  cancelled: 'Cancelled',
  completed: 'Completed',
}

function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5)
}

export function ReservationRow({ reservation, onStatusChange }: ReservationRowProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)

  const guestName = reservation.contacts
    ? `${reservation.contacts.first_name} ${reservation.contacts.last_name}`.trim()
    : 'Walk-in'

  const tableLabel = reservation.restaurant_tables?.label ?? null

  async function handleStatus(status: ReservationStatus) {
    setUpdating(true)
    try {
      const res = await fetch('/api/restaurant/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reservation.id, status }),
      })
      if (res.ok) {
        onStatusChange(reservation.id, status)
        setExpanded(false)
      }
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className="text-sm font-mono text-gray-300 w-12 shrink-0">
          {formatTime(reservation.reservation_time)}
        </span>
        <span className="text-sm flex-1 truncate">{guestName}</span>
        <span className="text-xs bg-[#3A3C40] text-gray-300 px-1.5 py-0.5 rounded-full shrink-0">
          x{reservation.party_size}
        </span>
        {tableLabel && (
          <span className="text-xs text-gray-500 shrink-0 hidden sm:block">{tableLabel}</span>
        )}
        <span
          className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[reservation.status]}`}
        >
          {STATUS_LABELS[reservation.status]}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 bg-[#1E2023]/40">
          {(reservation.special_requests || reservation.whatsapp_number) && (
            <div className="text-xs text-gray-400 space-y-1 pt-1">
              {reservation.whatsapp_number && (
                <p>WhatsApp: {reservation.whatsapp_number}</p>
              )}
              {reservation.special_requests && (
                <p>Notes: {reservation.special_requests}</p>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {reservation.status !== 'seated' && reservation.status !== 'cancelled' && reservation.status !== 'no_show' && (
              <button
                onClick={() => router.push('/restaurant/tables')}
                className="bg-[#6B1420] text-white text-xs px-3 py-1.5 rounded-lg font-medium"
              >
                Seat Now
              </button>
            )}
            {reservation.status === 'pending' && (
              <button
                onClick={() => handleStatus('confirmed')}
                disabled={updating}
                className="bg-green-800/60 text-green-300 text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-40"
              >
                Confirm
              </button>
            )}
            {reservation.status !== 'no_show' && reservation.status !== 'cancelled' && reservation.status !== 'completed' && (
              <button
                onClick={() => handleStatus('no_show')}
                disabled={updating}
                className="bg-red-900/40 text-red-400 text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-40"
              >
                No Show
              </button>
            )}
            {reservation.status !== 'cancelled' && reservation.status !== 'completed' && (
              <button
                onClick={() => handleStatus('cancelled')}
                disabled={updating}
                className="bg-[#3A3C40] text-gray-400 text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-40"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
