'use client'
import { useState, useEffect } from 'react'

interface Table {
  id: string
  label: string
  section: string | null
}

interface Props {
  restaurantId: string
  onClose: () => void
  onSaved: () => void
}

type Source = 'phone' | 'whatsapp' | 'walk_in' | 'online' | 'staff'

const SOURCE_LABELS: Record<Source, string> = {
  phone: 'Phone',
  whatsapp: 'WhatsApp',
  walk_in: 'Walk-in',
  online: 'Online',
  staff: 'Staff',
}

export function AddReservationSheet({ restaurantId, onClose, onSaved }: Props) {
  const [tables, setTables] = useState<Table[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    guest_name: '',
    reservation_date: new Date().toISOString().split('T')[0],
    reservation_time: '',
    party_size: '2',
    table_id: '',
    whatsapp_number: '',
    special_requests: '',
    source: 'staff' as Source,
  })

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof form, string>>>({})

  useEffect(() => {
    fetch(`/api/restaurant/tables?restaurant_id=${restaurantId}`)
      .then(r => r.json())
      .then(d => setTables(d.tables ?? []))
      .catch(() => {})
  }, [restaurantId])

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setFieldErrors(e => ({ ...e, [key]: undefined }))
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof typeof form, string>> = {}
    if (!form.guest_name.trim()) errs.guest_name = 'Name is required'
    if (!form.reservation_date) errs.reservation_date = 'Date is required'
    if (!form.reservation_time) errs.reservation_time = 'Time is required'
    if (!form.party_size || Number(form.party_size) < 1) errs.party_size = 'Party size must be at least 1'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/restaurant/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          reservation_date: form.reservation_date,
          reservation_time: form.reservation_time,
          party_size: Number(form.party_size),
          table_id: form.table_id || undefined,
          whatsapp_number: form.whatsapp_number || undefined,
          special_requests: form.special_requests || undefined,
          source: form.source,
          status: 'confirmed',
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Failed to save reservation')
        return
      }
      onSaved()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-[#1E2023] rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#1E2023] px-5 pt-5 pb-3 border-b border-white/10">
          <h2 className="font-semibold text-base">New Reservation</h2>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Guest name */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Guest name</label>
            <input
              type="text"
              value={form.guest_name}
              onChange={e => set('guest_name', e.target.value)}
              placeholder="e.g. Smith"
              className={`w-full bg-[#2D2F33] rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6B1420] ${fieldErrors.guest_name ? 'ring-1 ring-red-500' : ''}`}
            />
            {fieldErrors.guest_name && (
              <p className="text-xs text-red-400 mt-1">{fieldErrors.guest_name}</p>
            )}
          </div>

          {/* Date + Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Date</label>
              <input
                type="date"
                value={form.reservation_date}
                onChange={e => set('reservation_date', e.target.value)}
                className={`w-full bg-[#2D2F33] rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6B1420] ${fieldErrors.reservation_date ? 'ring-1 ring-red-500' : ''}`}
              />
              {fieldErrors.reservation_date && (
                <p className="text-xs text-red-400 mt-1">{fieldErrors.reservation_date}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Time</label>
              <input
                type="time"
                value={form.reservation_time}
                onChange={e => set('reservation_time', e.target.value)}
                className={`w-full bg-[#2D2F33] rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6B1420] ${fieldErrors.reservation_time ? 'ring-1 ring-red-500' : ''}`}
              />
              {fieldErrors.reservation_time && (
                <p className="text-xs text-red-400 mt-1">{fieldErrors.reservation_time}</p>
              )}
            </div>
          </div>

          {/* Party size */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Party size</label>
            <input
              type="number"
              min={1}
              max={200}
              value={form.party_size}
              onChange={e => set('party_size', e.target.value)}
              className={`w-full bg-[#2D2F33] rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6B1420] ${fieldErrors.party_size ? 'ring-1 ring-red-500' : ''}`}
            />
            {fieldErrors.party_size && (
              <p className="text-xs text-red-400 mt-1">{fieldErrors.party_size}</p>
            )}
          </div>

          {/* Table */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Table</label>
            <select
              value={form.table_id}
              onChange={e => set('table_id', e.target.value)}
              className="w-full bg-[#2D2F33] rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6B1420]"
            >
              <option value="">Select table (optional)</option>
              {tables.map(t => (
                <option key={t.id} value={t.id}>
                  {t.label}{t.section ? ` — ${t.section}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* WhatsApp */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">WhatsApp number</label>
            <input
              type="tel"
              value={form.whatsapp_number}
              onChange={e => set('whatsapp_number', e.target.value)}
              placeholder="+27 ..."
              className="w-full bg-[#2D2F33] rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6B1420]"
            />
          </div>

          {/* Special requests */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Special requests</label>
            <textarea
              value={form.special_requests}
              onChange={e => set('special_requests', e.target.value)}
              rows={2}
              placeholder="Allergies, dietary needs, occasion..."
              className="w-full bg-[#2D2F33] rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6B1420] resize-none"
            />
          </div>

          {/* Source */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">Source</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(SOURCE_LABELS) as [Source, string][]).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set('source', val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    form.source === val
                      ? 'bg-[#6B1420] text-white'
                      : 'bg-[#3A3C40] text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500/40 rounded-xl px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-[#1E2023] px-5 pb-5 pt-3 border-t border-white/10 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-[#3A3C40] text-gray-300 rounded-xl py-2.5 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-[#6B1420] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
