'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type TableSession = {
  id: string
  status: string
  party_size: number
  opened_at: string
  waiter_id: string | null
  restaurant_staff: { display_name: string } | null
}

type Table = {
  id: string
  label: string
  section: string | null
  capacity: number
  qr_code_url: string | null
  activeSession: TableSession | null
}

type Restaurant = {
  id: string
  name: string
}

const SECTION_ORDER = ['indoor', 'outdoor', 'bar', 'patio', 'private']

function statusColor(session: TableSession | null) {
  if (!session) return 'bg-[#3A3C40] border-white/10 text-gray-400'
  if (session.status === 'bill_requested') return 'bg-amber-900/40 border-amber-500/50 text-amber-300'
  if (session.status === 'partially_paid') return 'bg-blue-900/40 border-blue-500/50 text-blue-300'
  return 'bg-[#6B1420]/30 border-[#6B1420]/60 text-white'
}

function statusLabel(session: TableSession | null) {
  if (!session) return 'Available'
  if (session.status === 'bill_requested') return 'Bill Requested'
  if (session.status === 'partially_paid') return 'Part Paid'
  return `Open · ${session.party_size} pax`
}

export default function TablesPage() {
  const router = useRouter()
  const [tables, setTables] = useState<Table[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [activeRestaurant, setActiveRestaurant] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState<Table | null>(null)
  const [staff, setStaff] = useState<Array<{ id: string; display_name: string }>>([])
  const [openForm, setOpenForm] = useState({ waiter_id: '', party_size: '2', split_mode: 'none' as 'none' | 'equal' | 'by_item' })
  const [submitting, setSubmitting] = useState(false)

  const fetchTables = useCallback(async (restaurantId?: string) => {
    const url = restaurantId
      ? `/api/restaurant/tables?restaurant_id=${restaurantId}`
      : '/api/restaurant/tables'
    const res = await fetch(url)
    const data = await res.json()
    setTables(data.tables ?? [])
  }, [])

  useEffect(() => {
    async function init() {
      const [restRes] = await Promise.all([
        fetch('/api/restaurant/settings?restaurant_id=list').catch(() => null),
      ])
      // Fetch all restaurants for this org via the tables endpoint (includes restaurant join)
      const tablesRes = await fetch('/api/restaurant/tables')
      const tablesData = await tablesRes.json()
      const allTables: Table[] = tablesData.tables ?? []
      setTables(allTables)

      // Extract unique restaurants from tables (need a restaurant list endpoint)
      const restListRes = await fetch('/api/restaurant/menu?type=restaurants')
      if (restListRes.ok) {
        const d = await restListRes.json()
        setRestaurants(d.restaurants ?? [])
      }

      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (activeRestaurant) {
      fetchTables(activeRestaurant)
      fetch(`/api/restaurant/staff?restaurant_id=${activeRestaurant}`)
        .then(r => r.json())
        .then(d => setStaff(d.staff ?? []))
    } else {
      fetchTables()
    }
  }, [activeRestaurant, fetchTables])

  // Auto-refresh floor plan every 30s
  useEffect(() => {
    const timer = setInterval(() => fetchTables(activeRestaurant ?? undefined), 30000)
    return () => clearInterval(timer)
  }, [activeRestaurant, fetchTables])

  async function openSession() {
    if (!openModal || !openForm.waiter_id) return
    setSubmitting(true)
    await fetch('/api/restaurant/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table_id: openModal.id,
        waiter_id: openForm.waiter_id,
        party_size: Number(openForm.party_size),
        split_mode: openForm.split_mode,
      }),
    })
    setOpenModal(null)
    setSubmitting(false)
    fetchTables(activeRestaurant ?? undefined)
  }

  const sections = SECTION_ORDER.filter(s => tables.some(t => t.section === s))
  const ungrouped = tables.filter(t => !t.section)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#2D2F33]">
        <div className="w-8 h-8 border-2 border-[#6B1420] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#2D2F33] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1E2023] border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <h1 className="text-lg font-semibold flex-1">Floor Plan</h1>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#6B1420]/80" />
          <span className="text-xs text-gray-400">Open</span>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 ml-2" />
          <span className="text-xs text-gray-400">Bill Req</span>
          <div className="w-2.5 h-2.5 rounded-full bg-[#3A3C40] ml-2" />
          <span className="text-xs text-gray-400">Free</span>
        </div>
      </div>

      {/* Restaurant filter tabs */}
      {restaurants.length > 1 && (
        <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto">
          <button
            onClick={() => setActiveRestaurant(null)}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${!activeRestaurant ? 'bg-[#6B1420] text-white' : 'bg-[#3A3C40] text-gray-300'}`}
          >
            All
          </button>
          {restaurants.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveRestaurant(r.id)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${activeRestaurant === r.id ? 'bg-[#6B1420] text-white' : 'bg-[#3A3C40] text-gray-300'}`}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 py-4 space-y-6">
        {/* Grouped sections */}
        {sections.map(section => (
          <div key={section}>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              {section.replace('_', ' ')}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {tables.filter(t => t.section === section).map(table => (
                <TableCard
                  key={table.id}
                  table={table}
                  onOpen={() => { setOpenModal(table); setOpenForm({ waiter_id: '', party_size: '2', split_mode: 'none' }) }}
                  onGoToPOS={() => router.push(`/restaurant/pos/${table.activeSession!.id}`)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Ungrouped */}
        {ungrouped.length > 0 && (
          <div>
            {sections.length > 0 && (
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Other</p>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {ungrouped.map(table => (
                <TableCard
                  key={table.id}
                  table={table}
                  onOpen={() => { setOpenModal(table); setOpenForm({ waiter_id: '', party_size: '2', split_mode: 'none' }) }}
                  onGoToPOS={() => router.push(`/restaurant/pos/${table.activeSession!.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {tables.length === 0 && (
          <div className="text-center text-gray-600 py-16">No tables configured yet.</div>
        )}
      </div>

      {/* Open Session Modal */}
      {openModal && !openModal.activeSession && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#1E2023] rounded-2xl w-full max-w-sm p-5 space-y-4">
            <h2 className="font-semibold text-base">Open Table {openModal.label}</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Waiter</label>
                <select
                  value={openForm.waiter_id}
                  onChange={e => setOpenForm(f => ({ ...f, waiter_id: e.target.value }))}
                  className="w-full bg-[#2D2F33] rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6B1420]"
                >
                  <option value="">Select waiter...</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.display_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Party size</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={openForm.party_size}
                  onChange={e => setOpenForm(f => ({ ...f, party_size: e.target.value }))}
                  className="w-full bg-[#2D2F33] rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6B1420]"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Split bill</label>
                <div className="flex gap-2">
                  {(['none', 'equal', 'by_item'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setOpenForm(f => ({ ...f, split_mode: m }))}
                      className={`flex-1 py-1.5 rounded-lg text-sm ${openForm.split_mode === m ? 'bg-[#6B1420] text-white' : 'bg-[#3A3C40] text-gray-300'}`}
                    >
                      {m === 'none' ? 'No split' : m === 'equal' ? 'Equal' : 'By item'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setOpenModal(null)}
                className="flex-1 bg-[#3A3C40] text-gray-300 rounded-xl py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={openSession}
                disabled={!openForm.waiter_id || submitting}
                className="flex-1 bg-[#6B1420] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40"
              >
                {submitting ? 'Opening...' : 'Open Table'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TableCard({
  table,
  onOpen,
  onGoToPOS,
}: {
  table: Table
  onOpen: () => void
  onGoToPOS: () => void
}) {
  const hasSession = !!table.activeSession
  return (
    <button
      onClick={hasSession ? onGoToPOS : onOpen}
      className={`rounded-xl border p-3 text-left transition-colors active:scale-95 ${statusColor(table.activeSession)}`}
    >
      <p className="text-sm font-semibold leading-none">{table.label}</p>
      <p className="text-[10px] mt-1.5 opacity-70">{statusLabel(table.activeSession)}</p>
      {table.activeSession?.restaurant_staff && (
        <p className="text-[10px] opacity-50 truncate mt-0.5">
          {table.activeSession.restaurant_staff.display_name}
        </p>
      )}
    </button>
  )
}
