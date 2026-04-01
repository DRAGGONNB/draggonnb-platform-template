'use client'

import { useEffect, useState } from 'react'
import { Settings, Plus, Globe, MessageCircle, LayoutGrid, Activity } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ELIJAH_MODULE_ID } from '@/lib/elijah/constants'

interface Section {
  id: string
  name: string
  description: string | null
}

interface CommunityConfig {
  name: string
  timezone: string
}

export default function SettingsPage() {
  const [config, setConfig] = useState<CommunityConfig | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/elijah/settings').then(r => r.json()),
      fetch('/api/elijah/sections').then(r => r.json()),
    ])
      .then(([configData, sectionsData]) => {
        setConfig(configData.config || null)
        setSections(sectionsData.sections || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Configure your Elijah security module</p>
      </div>

      {/* Community Config */}
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Community Configuration</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Community Name</label>
            <p className="text-sm font-medium text-gray-900">{config?.name || 'Not configured'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Timezone</label>
            <p className="text-sm font-medium text-gray-900">{config?.timezone || 'Africa/Johannesburg'}</p>
          </div>
        </div>
      </div>

      {/* Sections Management */}
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <LayoutGrid className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Sections</h2>
          </div>
          <button className="flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800">
            <Plus className="h-3.5 w-3.5" />
            Add Section
          </button>
        </div>
        {sections.length === 0 ? (
          <p className="text-sm text-gray-500">No sections configured. Add sections to organize your community.</p>
        ) : (
          <div className="space-y-2">
            {sections.map(s => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.name}</p>
                  {s.description && <p className="text-xs text-gray-500">{s.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WhatsApp Setup */}
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">WhatsApp Integration</h2>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4">
          <div className="h-3 w-3 rounded-full bg-gray-300" />
          <p className="text-sm text-gray-500">Not connected. WhatsApp setup will be available in a future update.</p>
        </div>
      </div>

      {/* Module Status */}
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Module Status</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Elijah Module</p>
              <p className="text-xs text-gray-500">{ELIJAH_MODULE_ID}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Roll Call</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Fire Operations</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Patrols</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
