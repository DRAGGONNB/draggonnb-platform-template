'use client'

import { useEffect, useState } from 'react'
import { Wrench, Plus } from 'lucide-react'
import { EQUIPMENT_TYPE_LABELS } from '@/lib/elijah/constants'
import { cn } from '@/lib/utils/cn'

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  deployed: 'bg-red-100 text-red-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
  decommissioned: 'bg-gray-100 text-gray-500',
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/elijah/fire/equipment')
      .then(r => r.json())
      .then(d => { setEquipment(d.equipment || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipment Register</h1>
          <p className="text-sm text-gray-500">{equipment.length} items tracked</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          <Plus className="h-4 w-4" />
          Add Equipment
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
        </div>
      ) : equipment.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <Wrench className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">No equipment registered</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Group</th>
                <th className="px-5 py-3">Last Serviced</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {equipment.map(e => {
                const group = Array.isArray(e.group) ? (e.group as Record<string, string>[])[0] : e.group as Record<string, string> | null
                return (
                  <tr key={e.id as string} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{e.name as string}</td>
                    <td className="px-5 py-3 text-gray-600">{EQUIPMENT_TYPE_LABELS[e.type as string] || e.type as string}</td>
                    <td className="px-5 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_COLORS[e.status as string])}>
                        {e.status as string}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{group?.name || '--'}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {e.last_serviced ? new Date(e.last_serviced as string).toLocaleDateString('en-ZA') : '--'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
