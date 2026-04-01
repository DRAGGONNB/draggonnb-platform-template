'use client'

import { useEffect, useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SOP {
  id: string
  title: string
  created_at: string
}

export default function SOPsPage() {
  const [sops, setSOPs] = useState<SOP[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/elijah/sops')
      .then(r => r.json())
      .then(d => { setSOPs(d.sops || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Standard Operating Procedures</h1>
          <p className="text-sm text-gray-500">Manage your community SOP templates</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          <Plus className="h-4 w-4" />
          Add SOP
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
        </div>
      ) : sops.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">No SOPs created yet</p>
          <p className="mt-1 text-xs text-gray-400">Add standard operating procedures to guide your community responses</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sops.map(sop => (
            <div
              key={sop.id}
              className="flex items-center gap-4 rounded-xl border bg-white p-4 transition-colors hover:bg-gray-50"
            >
              <FileText className="h-5 w-5 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{sop.title}</p>
                <p className="text-xs text-gray-500">
                  Created {new Date(sop.created_at).toLocaleDateString('en-ZA')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
