'use client'

import { useEffect, useState } from 'react'
import { Droplets, Plus } from 'lucide-react'
import { WATER_POINT_STATUS_COLORS, WATER_POINT_TYPE_LABELS } from '@/lib/elijah/constants'
import { cn } from '@/lib/utils/cn'

const STATUS_BADGE: Record<string, string> = {
  operational: 'bg-green-100 text-green-700',
  low: 'bg-yellow-100 text-yellow-700',
  empty: 'bg-red-100 text-red-700',
  maintenance: 'bg-gray-100 text-gray-600',
  unknown: 'bg-gray-100 text-gray-400',
}

export default function WaterPointsPage() {
  const [waterPoints, setWaterPoints] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/elijah/fire/water-points')
      .then(r => r.json())
      .then(d => { setWaterPoints(d.water_points || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Water Points</h1>
          <p className="text-sm text-gray-500">{waterPoints.length} registered water sources</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Add Water Point
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        </div>
      ) : waterPoints.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <Droplets className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">No water points registered</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {waterPoints.map(wp => (
            <div key={wp.id as string} className="rounded-xl border bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg p-1.5" style={{ backgroundColor: `${WATER_POINT_STATUS_COLORS[wp.status as keyof typeof WATER_POINT_STATUS_COLORS]}20` }}>
                    <Droplets className="h-4 w-4" style={{ color: WATER_POINT_STATUS_COLORS[wp.status as keyof typeof WATER_POINT_STATUS_COLORS] }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{wp.name as string}</p>
                    <p className="text-xs text-gray-500">{WATER_POINT_TYPE_LABELS[wp.type as string] || wp.type as string}</p>
                  </div>
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_BADGE[wp.status as string])}>
                  {wp.status as string}
                </span>
              </div>
              {Number(wp.capacity_litres) > 0 ? (
                <p className="mt-2 text-xs text-gray-500">Capacity: {Number(wp.capacity_litres).toLocaleString()}L</p>
              ) : null}
              {typeof wp.access_notes === 'string' && wp.access_notes ? (
                <p className="mt-1 text-xs text-gray-400">{wp.access_notes}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
