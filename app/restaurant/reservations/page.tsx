'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RESTAURANT_ID, RESERVATION_STATUS_COLORS } from '@/lib/restaurant/constants'
import type { ReservationStatus } from '@/lib/restaurant/types'
import {
  Loader2, CalendarCheck, Plus, X, ChevronLeft, ChevronRight, Users, Clock, Phone,
} from 'lucide-react'

interface Reservation {
  id: string
  guest_name: string
  guest_phone: string | null
  guest_email: string | null
  party_size: number
  reservation_date: string
  reservation_time: string
  status: ReservationStatus
  special_requests: string | null
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [showForm, setShowForm] = useState(false)

  const fetchReservations = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('restaurant_reservations')
      .select('*')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('reservation_date', selectedDate)
      .order('reservation_time')
    setReservations(data ?? [])
    setLoading(false)
  }, [selectedDate])

  useEffect(() => { setLoading(true); fetchReservations() }, [fetchReservations])

  function shiftDate(days: number) {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  async function updateStatus(id: string, status: ReservationStatus) {
    const supabase = createClient()
    await supabase.from('restaurant_reservations').update({ status }).eq('id', id)
    fetchReservations()
  }

  const byStatus = {
    upcoming: reservations.filter((r) => ['pending', 'confirmed'].includes(r.status)),
    seated: reservations.filter((r) => r.status === 'seated'),
    done: reservations.filter((r) => ['completed', 'cancelled', 'no_show'].includes(r.status)),
  }

  const totalGuests = reservations.reduce((sum, r) => sum + r.party_size, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
          <p className="text-sm text-gray-500 mt-1">{reservations.length} bookings &middot; {totalGuests} guests</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0077B6] text-white text-sm font-medium hover:bg-[#006299]">
          <Plus size={16} /> New Booking
        </button>
      </div>

      {/* Date nav */}
      <div className="flex items-center gap-3">
        <button onClick={() => shiftDate(-1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} /></button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900">{formatDate(selectedDate)}</p>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs text-[#0077B6] cursor-pointer bg-transparent border-none outline-none" />
        </div>
        <button onClick={() => shiftDate(1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={18} /></button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#0077B6]" /></div>
      ) : reservations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <CalendarCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No reservations for this date</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[
            { label: 'Upcoming', items: byStatus.upcoming },
            { label: 'Seated', items: byStatus.seated },
            { label: 'Completed', items: byStatus.done },
          ].filter((g) => g.items.length > 0).map((group) => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{group.label} ({group.items.length})</h3>
              <div className="space-y-2">
                {group.items.map((r) => {
                  const sc = RESERVATION_STATUS_COLORS[r.status] ?? { text: 'text-gray-500', bg: 'bg-gray-100' }
                  return (
                    <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono font-medium text-gray-700">{r.reservation_time.slice(0, 5)}</span>
                          <span className="text-sm font-semibold text-gray-900">{r.guest_name}</span>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${sc.text} ${sc.bg}`}>{r.status.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                        <span className="flex items-center gap-1"><Users size={12} />{r.party_size} guests</span>
                        {r.guest_phone && <span className="flex items-center gap-1"><Phone size={12} />{r.guest_phone}</span>}
                        {r.special_requests && <span className="truncate max-w-[200px]">{r.special_requests}</span>}
                      </div>
                      {['pending', 'confirmed'].includes(r.status) && (
                        <div className="flex gap-2">
                          {r.status === 'pending' && (
                            <button onClick={() => updateStatus(r.id, 'confirmed')} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Confirm</button>
                          )}
                          <button onClick={() => updateStatus(r.id, 'seated')} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">Seat</button>
                          <button onClick={() => updateStatus(r.id, 'no_show')} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100">No Show</button>
                          <button onClick={() => updateStatus(r.id, 'cancelled')} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">Cancel</button>
                        </div>
                      )}
                      {r.status === 'seated' && (
                        <button onClick={() => updateStatus(r.id, 'completed')} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">Mark Complete</button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <AddReservationModal date={selectedDate} onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); fetchReservations() }} />}
    </div>
  )
}

function AddReservationModal({ date, onClose, onCreated }: { date: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [time, setTime] = useState('19:00')
  const [partySize, setPartySize] = useState(2)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!name.trim()) { setError('Guest name required'); return }
    setError('')
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: rest } = await supabase.from('restaurants').select('organization_id').eq('id', RESTAURANT_ID).single()
      const { error: err } = await supabase.from('restaurant_reservations').insert({
        organization_id: rest?.organization_id,
        restaurant_id: RESTAURANT_ID,
        guest_name: name.trim(),
        guest_phone: phone.trim() || null,
        party_size: partySize,
        reservation_date: date,
        reservation_time: time,
        status: 'pending',
        special_requests: notes.trim() || null,
      })
      if (err) { setError(err.message); setSubmitting(false); return }
      onCreated()
    } catch { setError('Failed'); setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">New Reservation</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Guest Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Party Size</label>
              <input type="number" min={1} max={50} value={partySize} onChange={(e) => setPartySize(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone (optional)</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-4 py-2 rounded-lg bg-[#0077B6] text-white text-sm hover:bg-[#006299] disabled:opacity-50 flex items-center gap-2">
            {submitting && <Loader2 size={14} className="animate-spin" />} Book
          </button>
        </div>
      </div>
    </div>
  )
}
