'use client'
import { useState } from 'react'
import type { EquipmentType, TempStatus } from '@/lib/restaurant/types'

interface Props {
  restaurantId: string
  staffId: string
  onClose: () => void
  onSaved: (status: TempStatus) => void
}

const THRESHOLDS: Record<EquipmentType, { warning: number; critical: number; direction: 'above' | 'below' }> = {
  fridge:   { warning: 5,   critical: 8,   direction: 'above' },
  freezer:  { warning: -15, critical: -10, direction: 'above' },
  hot_hold: { warning: 60,  critical: 55,  direction: 'below' },
  cooking:  { warning: 60,  critical: 55,  direction: 'below' },
  ambient:  { warning: 25,  critical: 30,  direction: 'above' },
}

const THRESHOLD_HINTS: Record<EquipmentType, string> = {
  fridge:   'Fridge: OK \u22645\u00b0C | Warning 5\u20138\u00b0C | Critical >8\u00b0C',
  freezer:  'Freezer: OK <\u221215\u00b0C | Warning \u221215 to \u221210\u00b0C | Critical >\u221210\u00b0C',
  hot_hold: 'Hot hold: OK \u226565\u00b0C | Warning 60\u201365\u00b0C | Critical <55\u00b0C',
  cooking:  'Cooking: OK \u226565\u00b0C | Warning 60\u201365\u00b0C | Critical <55\u00b0C',
  ambient:  'Ambient: OK \u226425\u00b0C | Warning 25\u201330\u00b0C | Critical >30\u00b0C',
}

const EQUIPMENT_TYPES: EquipmentType[] = ['fridge', 'freezer', 'hot_hold', 'cooking', 'ambient']

const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  fridge: 'Fridge',
  freezer: 'Freezer',
  hot_hold: 'Hot Hold',
  cooking: 'Cooking',
  ambient: 'Ambient',
}

function computeStatus(type: EquipmentType, temp: number): TempStatus {
  const t = THRESHOLDS[type]
  if (t.direction === 'above') {
    if (temp >= t.critical) return 'critical'
    if (temp >= t.warning) return 'warning'
  } else {
    if (temp <= t.critical) return 'critical'
    if (temp <= t.warning) return 'warning'
  }
  return 'ok'
}

export function TempLogSheet({ restaurantId, staffId, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    equipment_name: '',
    equipment_type: 'fridge' as EquipmentType,
    temperature: '',
    corrective_action: '',
  })

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof form, string>>>({})

  const tempNum = Number(form.temperature)
  const tempValid = form.temperature !== '' && !isNaN(tempNum)
  const previewStatus: TempStatus | null = tempValid
    ? computeStatus(form.equipment_type, tempNum)
    : null
  const needsCorrectiveAction = previewStatus === 'warning' || previewStatus === 'critical'

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setFieldErrors(e => ({ ...e, [key]: undefined }))
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof typeof form, string>> = {}
    if (!form.equipment_name.trim()) errs.equipment_name = 'Equipment name is required'
    if (form.temperature === '' || isNaN(Number(form.temperature))) {
      errs.temperature = 'Temperature is required'
    }
    if (needsCorrectiveAction && !form.corrective_action.trim()) {
      errs.corrective_action = 'Corrective action is required for warning/critical readings'
    }
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/restaurant/temp-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          equipment_name: form.equipment_name.trim(),
          equipment_type: form.equipment_type,
          temperature: Number(form.temperature),
          corrective_action: form.corrective_action.trim() || undefined,
          logged_by: staffId || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Failed to save reading')
        return
      }
      const data = await res.json()
      onSaved(data.status as TempStatus)
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
          <h2 className="font-semibold text-base">Log Temperature Reading</h2>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Equipment name */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Equipment name</label>
            <input
              type="text"
              value={form.equipment_name}
              onChange={e => set('equipment_name', e.target.value)}
              placeholder="e.g. Walk-in Fridge"
              className={`w-full bg-[#2D2F33] rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6B1420] ${fieldErrors.equipment_name ? 'ring-1 ring-red-500' : ''}`}
            />
            {fieldErrors.equipment_name && (
              <p className="text-xs text-red-400 mt-1">{fieldErrors.equipment_name}</p>
            )}
          </div>

          {/* Equipment type */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Equipment type</label>
            <select
              value={form.equipment_type}
              onChange={e => set('equipment_type', e.target.value as EquipmentType)}
              className="w-full bg-[#2D2F33] rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6B1420]"
            >
              {EQUIPMENT_TYPES.map(t => (
                <option key={t} value={t}>{EQUIPMENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Temperature</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={form.temperature}
                onChange={e => set('temperature', e.target.value)}
                placeholder="0.0"
                className={`w-full bg-[#2D2F33] rounded-xl px-3 py-2 pr-10 text-sm outline-none focus:ring-1 focus:ring-[#6B1420] ${fieldErrors.temperature ? 'ring-1 ring-red-500' : ''}`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                &deg;C
              </span>
            </div>
            {fieldErrors.temperature && (
              <p className="text-xs text-red-400 mt-1">{fieldErrors.temperature}</p>
            )}

            {/* Threshold hint */}
            <p className="text-xs text-gray-500 mt-1.5">
              {THRESHOLD_HINTS[form.equipment_type]}
            </p>

            {/* Live status preview */}
            {previewStatus && (
              <div
                className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                  previewStatus === 'ok'
                    ? 'bg-green-900/30 text-green-400'
                    : previewStatus === 'warning'
                    ? 'bg-amber-900/30 text-amber-400'
                    : 'bg-red-900/30 text-red-400'
                }`}
              >
                {previewStatus === 'ok' && 'Within safe range'}
                {previewStatus === 'warning' && 'Warning — corrective action required'}
                {previewStatus === 'critical' && 'Critical — corrective action required'}
              </div>
            )}
          </div>

          {/* Corrective action */}
          {needsCorrectiveAction && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Corrective action <span className="text-red-400">*</span>
              </label>
              <textarea
                value={form.corrective_action}
                onChange={e => set('corrective_action', e.target.value)}
                rows={2}
                placeholder="Describe action taken..."
                className={`w-full bg-[#2D2F33] rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6B1420] resize-none ${fieldErrors.corrective_action ? 'ring-1 ring-red-500' : ''}`}
              />
              {fieldErrors.corrective_action && (
                <p className="text-xs text-red-400 mt-1">{fieldErrors.corrective_action}</p>
              )}
            </div>
          )}

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
            {saving ? 'Logging...' : 'Log Reading'}
          </button>
        </div>
      </div>
    </div>
  )
}
