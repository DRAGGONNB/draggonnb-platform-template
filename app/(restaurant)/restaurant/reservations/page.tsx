'use client'
import { useState, useEffect, useCallback } from 'react'
import { ReservationRow } from '@/components/restaurant/reservations/ReservationRow'
import { AddReservationSheet } from '@/components/restaurant/reservations/AddReservationSheet'
import type { ReservationStatus } from '@/lib/restaurant/types'

interface Reservation {
  id: string
  reservation_date: string
  reservation_time: string
  party_size: number
  status: ReservationStatus
  whatsapp_number: string | null
  special_requests: string | null
  restaurant_id: string
  contacts: { first_name: string; last_name: string } | null
  restaurant_tables: { label: string } | null
}

type DateFilter = 'today' | 'tomorrow' | 'custom'

function formatSectionDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  if (dateStr === today) return `Today — ${d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}`
  if (dateStr === tomorrow) return `Tomorrow — ${d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}`
  return d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0])
  const [restaurantId, setRestaurantId] = useState<string | null>(null)

  const getDateParam = useCallback(() => {
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    if (dateFilter === 'today') return today
    if (dateFilter === 'tomorrow') return tomorrow
    return customDate
  }, [dateFilter, customDate])

  const fetchReservations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const date = getDateParam()
      const res = await fetch(`/api/restaurant/reservations?date=${date}`)
      if (!res.ok) throw new Error('Failed to load reservations')
      const data = await res.json()
      const list: Reservation[] = data.reservations ?? []
      setReservations(list)
      if (list.length > 0 && !restaurantId) {
        setRestaurantId(list[0].restaurant_id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [getDateParam, restaurantId])

  useEffect(() => {
    fetchReservations()
  }, [fetchReservations])

  function handleStatusChange(id: string, status: ReservationStatus) {
    setReservations(prev =>
      prev.map(r => (r.id === id ? { ...r, status } : r)),
    )
  }

  // Group by date
  const grouped = reservations.reduce<Record<string, Reservation[]>>((acc, r) => {
    const key = r.reservation_date
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort()

  return (
    <div className="min-h-screen bg-[#2D2F33] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1E2023] border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <h1 className="text-lg font-semibold flex-1">Reservations</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-[#6B1420] text-white text-sm px-3 py-1.5 rounded-lg font-medium"
          >
            + Add
          </button>
        </div>

        {/* Date filter */}
        <div className="flex items-center gap-2 mt-3 max-w-lg mx-auto">
          {(['today', 'tomorrow'] as DateFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
                dateFilter === f ? 'bg-[#6B1420] text-white' : 'bg-[#3A3C40] text-gray-300'
              }`}
            >
              {f === 'today' ? 'Today' : 'Tomorrow'}
            </button>
          ))}
          <button
            onClick={() => setDateFilter('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              dateFilter === 'custom' ? 'bg-[#6B1420] text-white' : 'bg-[#3A3C40] text-gray-300'
            }`}
          >
            Pick date
          </button>
          {dateFilter === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              className="bg-[#2D2F33] rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-[#6B1420]"
            />
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#6B1420] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="px-4 py-6 text-center text-red-400 text-sm">{error}</div>
        )}

        {!loading && !error && reservations.length === 0 && (
          <div className="px-4 py-16 text-center">
            <p className="text-gray-500 text-sm">No reservations for this date.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 text-sm text-[#6B1420] hover:underline"
            >
              Add a reservation
            </button>
          </div>
        )}

        {!loading && sortedDates.map(date => (
          <div key={date}>
            <div className="px-4 py-2 bg-[#2D2F33] sticky top-[108px] z-[5]">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {formatSectionDate(date)}
              </p>
            </div>
            <div className="bg-[#1E2023] mx-4 my-2 rounded-2xl overflow-hidden">
              {grouped[date].map(r => (
                <ReservationRow
                  key={r.id}
                  reservation={r}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {showAdd && restaurantId && (
        <AddReservationSheet
          restaurantId={restaurantId}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false)
            fetchReservations()
          }}
        />
      )}

      {showAdd && !restaurantId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E2023] rounded-2xl p-6 max-w-sm w-full text-center">
            <p className="text-gray-400 text-sm mb-4">No restaurant configured. Set one up first.</p>
            <button
              onClick={() => setShowAdd(false)}
              className="bg-[#3A3C40] text-gray-300 rounded-xl px-4 py-2 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
