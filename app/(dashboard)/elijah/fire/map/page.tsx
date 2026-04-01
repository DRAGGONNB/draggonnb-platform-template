'use client'

import { Flame, Droplets, Map } from 'lucide-react'

export default function FireMapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fire Operations Map</h1>
        <p className="text-sm text-gray-500">Live view of fire incidents, water points, farms, and response groups</p>
      </div>

      {/* Map placeholder - will integrate Leaflet/Mapbox when PostGIS data is available */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-green-50 to-blue-50" style={{ height: '600px' }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Map className="h-16 w-16 text-gray-300" />
          <p className="mt-4 text-sm font-medium text-gray-500">Map will render here</p>
          <p className="text-xs text-gray-400">Requires Supabase connection for PostGIS data</p>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 rounded-lg border bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold text-gray-700">Legend</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <Flame className="h-3 w-3 text-red-600" />
              <span>Active fire</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="h-3 w-3 rounded-full bg-green-500" />
              <span>Water point (operational)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="h-3 w-3 rounded-full bg-yellow-500" />
              <span>Water point (low)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              <span>Water point (empty)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="h-3 w-3 rounded-full border-2 border-blue-500 bg-transparent" />
              <span>Farm boundary</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="h-3 w-3 rounded-sm bg-blue-600" />
              <span>Response group</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
