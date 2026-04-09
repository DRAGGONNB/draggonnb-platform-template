'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RESTAURANT_ID } from '@/lib/restaurant/constants'
import {
  Loader2, Thermometer, Plus, X, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight,
} from 'lucide-react'

interface Equipment {
  id: string
  name: string
  type: string
  location: string | null
  min_temp: number | null
  max_temp: number | null
  is_active: boolean
}

interface TempLog {
  id: string
  equipment_id: string
  temperature: number
  is_in_range: boolean
  recorded_by: string | null
  corrective_action: string | null
  recorded_at: string
  equipment?: { name: string; type: string }
}

const TYPE_COLORS: Record<string, { text: string; bg: string }> = {
  fridge: { text: 'text-blue-700', bg: 'bg-blue-50' },
  freezer: { text: 'text-indigo-700', bg: 'bg-indigo-50' },
  hot_hold: { text: 'text-red-700', bg: 'bg-red-50' },
  cooking: { text: 'text-orange-700', bg: 'bg-orange-50' },
  ambient: { text: 'text-gray-700', bg: 'bg-gray-100' },
}

function formatDateTime(str: string): string {
  return new Date(str).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function TemperatureLogPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [logs, setLogs] = useState<TempLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [showLogForm, setShowLogForm] = useState(false)
  const [showEquipForm, setShowEquipForm] = useState(false)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const dayStart = selectedDate + 'T00:00:00'
    const dayEnd = selectedDate + 'T23:59:59'

    const [equipRes, logRes] = await Promise.all([
      supabase.from('restaurant_equipment')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('is_active', true)
        .order('type')
        .order('name'),
      supabase.from('restaurant_temperature_logs')
        .select('*, equipment:restaurant_equipment(name, type)')
        .gte('recorded_at', dayStart)
        .lte('recorded_at', dayEnd)
        .order('recorded_at', { ascending: false }),
    ])

    setEquipment(equipRes.data ?? [])
    setLogs((logRes.data ?? []).map((l: Record<string, unknown>) => ({
      ...l,
      equipment: l.equipment ? (l.equipment as unknown as { name: string; type: string }) : undefined,
    })) as TempLog[])
    setLoading(false)
  }, [selectedDate])

  useEffect(() => { setLoading(true); fetchData() }, [fetchData])

  function shiftDate(days: number) {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const outOfRange = logs.filter((l) => !l.is_in_range).length
  const inRange = logs.filter((l) => l.is_in_range).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Temperature Logs</h1>
          <p className="text-sm text-gray-500 mt-1">{equipment.length} active units &middot; {logs.length} readings today</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowEquipForm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
            <Plus size={14} /> Equipment
          </button>
          <button onClick={() => setShowLogForm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0077B6] text-white text-sm font-medium hover:bg-[#006299]">
            <Thermometer size={16} /> Log Temp
          </button>
        </div>
      </div>

      {/* Date nav */}
      <div className="flex items-center gap-3">
        <button onClick={() => shiftDate(-1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} /></button>
        <div className="text-center">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm font-semibold text-gray-900 cursor-pointer bg-transparent border-none outline-none text-center" />
        </div>
        <button onClick={() => shiftDate(1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={18} /></button>
      </div>

      {/* Summary bar */}
      {logs.length > 0 && (
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">{inRange} in range</span>
          </div>
          {outOfRange > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle size={16} className="text-red-600" />
              <span className="text-sm font-medium text-red-700">{outOfRange} out of range</span>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#0077B6]" /></div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <Thermometer className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No temperature readings for this date</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const tc = TYPE_COLORS[log.equipment?.type ?? 'ambient'] ?? TYPE_COLORS.ambient
            return (
              <div key={log.id} className={`bg-white rounded-xl border p-4 ${log.is_in_range ? 'border-gray-200' : 'border-red-200 bg-red-50/30'}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-bold ${log.is_in_range ? 'text-gray-900' : 'text-red-600'}`}>
                      {log.temperature}&deg;C
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{log.equipment?.name ?? 'Unknown'}</p>
                      <span className={`text-xs font-medium capitalize ${tc.text}`}>{log.equipment?.type ?? 'unknown'}</span>
                    </div>
                  </div>
                  {log.is_in_range ? (
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  ) : (
                    <AlertTriangle size={20} className="text-red-500" />
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                  <span>{formatDateTime(log.recorded_at)}</span>
                  {log.recorded_by && <span>by {log.recorded_by}</span>}
                </div>
                {log.corrective_action && (
                  <p className="text-xs text-red-600 mt-2 bg-red-50 rounded-lg px-3 py-1.5">
                    Corrective action: {log.corrective_action}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showLogForm && <LogTempModal equipment={equipment} onClose={() => setShowLogForm(false)} onCreated={() => { setShowLogForm(false); fetchData() }} />}
      {showEquipForm && <AddEquipmentModal onClose={() => setShowEquipForm(false)} onCreated={() => { setShowEquipForm(false); fetchData() }} />}
    </div>
  )
}

function LogTempModal({ equipment, onClose, onCreated }: { equipment: Equipment[]; onClose: () => void; onCreated: () => void }) {
  const [equipId, setEquipId] = useState(equipment[0]?.id ?? '')
  const [temp, setTemp] = useState('')
  const [action, setAction] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!equipId || !temp) { setError('Select equipment and enter temperature'); return }
    setError('')
    setSubmitting(true)
    try {
      const supabase = createClient()
      const equip = equipment.find((e) => e.id === equipId)
      const tempNum = Number(temp)
      const inRange = equip ? (equip.min_temp == null || tempNum >= equip.min_temp) && (equip.max_temp == null || tempNum <= equip.max_temp) : true
      const { data: rest } = await supabase.from('restaurants').select('organization_id').eq('id', RESTAURANT_ID).single()
      const { error: err } = await supabase.from('restaurant_temperature_logs').insert({
        organization_id: rest?.organization_id,
        equipment_id: equipId,
        temperature: tempNum,
        is_in_range: inRange,
        corrective_action: action.trim() || null,
        recorded_at: new Date().toISOString(),
      })
      if (err) { setError(err.message); setSubmitting(false); return }
      onCreated()
    } catch { setError('Failed to log'); setSubmitting(false) }
  }

  const selectedEquip = equipment.find((e) => e.id === equipId)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Log Temperature</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Equipment</label>
            <select value={equipId} onChange={(e) => setEquipId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none">
              {equipment.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.type})</option>)}
            </select>
            {selectedEquip && selectedEquip.min_temp != null && selectedEquip.max_temp != null && (
              <p className="text-xs text-gray-400 mt-1">Range: {selectedEquip.min_temp}&deg;C to {selectedEquip.max_temp}&deg;C</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Temperature (&deg;C)</label>
            <input type="number" step={0.1} value={temp} onChange={(e) => setTemp(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none text-lg font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Corrective Action (if out of range)</label>
            <textarea value={action} onChange={(e) => setAction(e.target.value)} rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-4 py-2 rounded-lg bg-[#0077B6] text-white text-sm hover:bg-[#006299] disabled:opacity-50 flex items-center gap-2">
            {submitting && <Loader2 size={14} className="animate-spin" />} Log Reading
          </button>
        </div>
      </div>
    </div>
  )
}

function AddEquipmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('fridge')
  const [location, setLocation] = useState('')
  const [minTemp, setMinTemp] = useState('')
  const [maxTemp, setMaxTemp] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!name.trim()) { setError('Equipment name required'); return }
    setError('')
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: rest } = await supabase.from('restaurants').select('organization_id').eq('id', RESTAURANT_ID).single()
      const { error: err } = await supabase.from('restaurant_equipment').insert({
        organization_id: rest?.organization_id,
        restaurant_id: RESTAURANT_ID,
        name: name.trim(),
        type,
        location: location.trim() || null,
        min_temp: minTemp ? Number(minTemp) : null,
        max_temp: maxTemp ? Number(maxTemp) : null,
        is_active: true,
      })
      if (err) { setError(err.message); setSubmitting(false); return }
      onCreated()
    } catch { setError('Failed'); setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Add Equipment</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Walk-in Fridge #1"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none capitalize">
                {['fridge', 'freezer', 'hot_hold', 'cooking', 'ambient'].map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Kitchen"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Min Temp (&deg;C)</label>
              <input type="number" step={0.1} value={minTemp} onChange={(e) => setMinTemp(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Temp (&deg;C)</label>
              <input type="number" step={0.1} value={maxTemp} onChange={(e) => setMaxTemp(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-4 py-2 rounded-lg bg-[#0077B6] text-white text-sm hover:bg-[#006299] disabled:opacity-50 flex items-center gap-2">
            {submitting && <Loader2 size={14} className="animate-spin" />} Add Equipment
          </button>
        </div>
      </div>
    </div>
  )
}
