'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RESTAURANT_ID, formatZAR } from '@/lib/restaurant/constants'
import {
  Loader2, Calendar, Plus, X, MapPin, Users, Clock, Banknote,
} from 'lucide-react'

interface RestaurantEvent {
  id: string
  name: string
  type: string | null
  stage: string | null
  venue: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  expected_guests: number | null
  budget: number | null
  deposit_amount: number | null
  deposit_status: string | null
  client_name: string | null
  client_phone: string | null
  client_email: string | null
  notes: string | null
  status: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  draft: { text: 'text-gray-500', bg: 'bg-gray-100' },
  enquiry: { text: 'text-blue-700', bg: 'bg-blue-50' },
  confirmed: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  in_progress: { text: 'text-amber-700', bg: 'bg-amber-50' },
  completed: { text: 'text-gray-500', bg: 'bg-gray-100' },
  cancelled: { text: 'text-red-700', bg: 'bg-red-50' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function EventsPage() {
  const [events, setEvents] = useState<RestaurantEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')

  const fetchEvents = useCallback(async () => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const query = supabase
      .from('events')
      .select('*')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('event_date', { ascending: tab === 'upcoming' })

    if (tab === 'upcoming') {
      query.gte('event_date', today)
    } else {
      query.lt('event_date', today)
    }

    const { data } = await query
    setEvents(data ?? [])
    setLoading(false)
  }, [tab])

  useEffect(() => { setLoading(true); fetchEvents() }, [fetchEvents])

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[#0077B6]" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-sm text-gray-500 mt-1">{events.length} {tab} events</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0077B6] text-white text-sm font-medium hover:bg-[#006299]">
          <Plus size={16} /> New Event
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['upcoming', 'past'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Event list */}
      {events.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No {tab} events</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const sc = STATUS_COLORS[event.status ?? 'draft'] ?? STATUS_COLORS.draft
            return (
              <div key={event.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{event.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDate(event.event_date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {event.type && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{event.type}</span>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${sc.text} ${sc.bg}`}>
                      {(event.status ?? 'draft').replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {event.client_name && (
                  <p className="text-xs text-gray-600 mb-2">Client: {event.client_name}{event.client_phone ? ` (${event.client_phone})` : ''}</p>
                )}

                {event.notes && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{event.notes}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  {event.start_time && (
                    <span className="flex items-center gap-1"><Clock size={12} />{event.start_time.slice(0, 5)}{event.end_time ? ` - ${event.end_time.slice(0, 5)}` : ''}</span>
                  )}
                  {event.venue && <span className="flex items-center gap-1"><MapPin size={12} />{event.venue}</span>}
                  {event.expected_guests != null && <span className="flex items-center gap-1"><Users size={12} />{event.expected_guests} guests</span>}
                  {event.budget != null && event.budget > 0 && (
                    <span className="flex items-center gap-1"><Banknote size={12} />{formatZAR(event.budget)}</span>
                  )}
                  {event.deposit_amount != null && event.deposit_amount > 0 && (
                    <span className="font-medium text-gray-700">Deposit: {formatZAR(event.deposit_amount)} ({event.deposit_status ?? 'pending'})</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && <AddEventModal onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); fetchEvents() }} />}
    </div>
  )
}

function AddEventModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('18:00')
  const [endTime, setEndTime] = useState('22:00')
  const [venue, setVenue] = useState('')
  const [guests, setGuests] = useState('')
  const [budget, setBudget] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!name.trim()) { setError('Event name required'); return }
    setError('')
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: rest } = await supabase.from('restaurants').select('organization_id').eq('id', RESTAURANT_ID).single()
      const { error: err } = await supabase.from('events').insert({
        organization_id: rest?.organization_id,
        restaurant_id: RESTAURANT_ID,
        name: name.trim(),
        type: type.trim() || null,
        event_date: date,
        start_time: startTime,
        end_time: endTime || null,
        venue: venue.trim() || null,
        expected_guests: guests ? Number(guests) : null,
        budget: budget ? Number(budget) : null,
        client_name: clientName.trim() || null,
        client_phone: clientPhone.trim() || null,
        notes: notes.trim() || null,
        status: 'enquiry',
      })
      if (err) { setError(err.message); setSubmitting(false); return }
      onCreated()
    } catch { setError('Failed to create event'); setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-base font-semibold text-gray-900">New Event</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Event Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wine Tasting Evening"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <input type="text" value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. private, corporate"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Venue</label>
              <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Main Deck"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expected Guests</label>
              <input type="number" min={1} value={guests} onChange={(e) => setGuests(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Budget (R)</label>
            <input type="number" min={0} step={0.01} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Client Name</label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Client Phone</label>
              <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+27..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-4 py-2 rounded-lg bg-[#0077B6] text-white text-sm hover:bg-[#006299] disabled:opacity-50 flex items-center gap-2">
            {submitting && <Loader2 size={14} className="animate-spin" />} Create Event
          </button>
        </div>
      </div>
    </div>
  )
}
