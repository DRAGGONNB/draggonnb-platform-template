'use client'
import { useState, useEffect, useCallback } from 'react'
import { TempLogRow } from '@/components/restaurant/compliance/TempLogRow'
import { TempLogSheet } from '@/components/restaurant/compliance/TempLogSheet'
import type { EquipmentType, TempStatus } from '@/lib/restaurant/types'

interface TempLog {
  id: string
  equipment_name: string
  equipment_type: EquipmentType
  temperature: number
  status: TempStatus
  logged_at: string
  corrective_action: string | null
  restaurant_id: string
  restaurant_staff: { display_name: string } | null
}

export default function TempLogPage() {
  const [logs, setLogs] = useState<TempLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [criticalAlert, setCriticalAlert] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  // Staff ID would come from session storage in a real PIN-auth flow
  const staffId = typeof window !== 'undefined' ? (sessionStorage.getItem('staffId') ?? '') : ''

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ date })
      if (restaurantId) params.set('restaurant_id', restaurantId)
      const res = await fetch(`/api/restaurant/temp-log?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load temperature logs')
      const data = await res.json()
      const list: TempLog[] = data.logs ?? []
      setLogs(list)
      if (list.length > 0 && !restaurantId) {
        setRestaurantId(list[0].restaurant_id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [date, restaurantId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Also fetch restaurant ID if we don't have it yet
  useEffect(() => {
    if (!restaurantId) {
      fetch('/api/restaurant/menu?type=restaurants')
        .then(r => r.json())
        .then(d => {
          const restaurants: Array<{ id: string }> = d.restaurants ?? []
          if (restaurants.length > 0) setRestaurantId(restaurants[0].id)
        })
        .catch(() => {})
    }
  }, [restaurantId])

  const criticalCount = logs.filter(l => l.status === 'critical').length
  const warningCount = logs.filter(l => l.status === 'warning').length

  function handleSaved(status: TempStatus) {
    setShowAdd(false)
    if (status === 'critical') setCriticalAlert(true)
    fetchLogs()
  }

  return (
    <div className="min-h-screen bg-[#2D2F33] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1E2023] border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <h1 className="text-lg font-semibold flex-1">Temp Log</h1>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-[#2D2F33] rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[#6B1420]"
          />
          <button
            onClick={() => setShowAdd(true)}
            className="bg-[#6B1420] text-white text-sm px-3 py-1.5 rounded-lg font-medium whitespace-nowrap"
          >
            + Log Reading
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4 py-4">
        {/* Critical alert banner */}
        {criticalAlert && (
          <div className="bg-red-900/30 border border-red-500/40 rounded-2xl px-4 py-3 flex items-start gap-3">
            <div className="flex-1 text-sm text-red-400 font-medium">
              Critical temp logged — staff alerted via Telegram
            </div>
            <button
              onClick={() => setCriticalAlert(false)}
              className="text-red-400 text-xs mt-0.5 shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Summary bar */}
        {!loading && logs.length > 0 && (
          <div className="flex items-center gap-3">
            {criticalCount > 0 && (
              <span className="bg-red-900/40 text-red-400 text-xs px-2.5 py-1 rounded-full font-medium">
                {criticalCount} critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="bg-amber-900/40 text-amber-400 text-xs px-2.5 py-1 rounded-full font-medium">
                {warningCount} warning
              </span>
            )}
            {criticalCount === 0 && warningCount === 0 && (
              <span className="bg-green-900/40 text-green-400 text-xs px-2.5 py-1 rounded-full font-medium">
                All readings OK
              </span>
            )}
            <span className="text-xs text-gray-500">{logs.length} readings today</span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#6B1420] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="text-center text-red-400 text-sm py-6">{error}</div>
        )}

        {/* Empty state */}
        {!loading && !error && logs.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm">No temperature readings for this date.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 text-sm text-[#6B1420] hover:underline"
            >
              Log a reading
            </button>
          </div>
        )}

        {/* Log list */}
        {!loading && logs.length > 0 && (
          <div className="bg-[#1E2023] rounded-2xl overflow-hidden">
            {logs.map(log => (
              <TempLogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>

      {showAdd && restaurantId && (
        <TempLogSheet
          restaurantId={restaurantId}
          staffId={staffId}
          onClose={() => setShowAdd(false)}
          onSaved={handleSaved}
        />
      )}

      {showAdd && !restaurantId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E2023] rounded-2xl p-6 max-w-sm w-full text-center">
            <p className="text-gray-400 text-sm mb-4">No restaurant configured.</p>
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
