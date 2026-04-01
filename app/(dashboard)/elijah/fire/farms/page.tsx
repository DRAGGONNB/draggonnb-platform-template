'use client'

import { useEffect, useState } from 'react'
import { Wheat, Plus, MapPin, Lock } from 'lucide-react'

export default function FarmsPage() {
  const [farms, setFarms] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/elijah/fire/farms')
      .then(r => r.json())
      .then(d => { setFarms(d.farms || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Farm Registry</h1>
          <p className="text-sm text-gray-500">{farms.length} registered farms with emergency access details</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          <Plus className="h-4 w-4" />
          Add Farm
        </button>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-600" />
          <p className="text-xs text-amber-700">Access codes are restricted to admin, dispatcher, and fire coordinator roles. All access is audited for POPIA compliance.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
        </div>
      ) : farms.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <Wheat className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">No farms registered</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {farms.map(f => (
            <div key={f.id as string} className="rounded-xl border bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{f.name as string}</p>
                  <p className="text-xs text-gray-500">Owner: {f.owner_name as string}{f.owner_phone ? ` (${f.owner_phone as string})` : ''}</p>
                </div>
                <MapPin className="h-4 w-4 text-gray-400" />
              </div>
              {typeof f.access_notes === 'string' && f.access_notes && (
                <p className="mt-2 text-xs text-gray-500">{f.access_notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
