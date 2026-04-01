'use client'

import { useEffect, useState } from 'react'
import { Users, Plus } from 'lucide-react'
import { GROUP_TYPE_LABELS } from '@/lib/elijah/constants'

export default function ResponderGroupsPage() {
  const [groups, setGroups] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/elijah/fire/groups')
      .then(r => r.json())
      .then(d => { setGroups(d.groups || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Responder Groups</h1>
          <p className="text-sm text-gray-500">Fire and emergency response teams</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          <Plus className="h-4 w-4" />
          Add Group
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">No responder groups registered</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => {
            const members = (g.members as Record<string, unknown>[]) || []
            return (
              <div key={g.id as string} className="rounded-xl border bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{g.name as string}</p>
                    <p className="text-xs text-gray-500">
                      {GROUP_TYPE_LABELS[g.type as string] || g.type as string}
                      {g.contact_phone ? ` | ${String(g.contact_phone)}` : ''}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {members.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {members.map((m: Record<string, unknown>) => {
                      const memberData = Array.isArray(m.member) ? (m.member as Record<string, string>[])[0] : m.member as Record<string, string> | null
                      return (
                        <span key={m.id as string} className="rounded-full bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
                          {memberData?.display_name || 'Unknown'} ({m.role as string})
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
