'use client'

import { useEffect, useState } from 'react'
import { UserCheck, Plus, Shield } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface Member {
  id: string
  display_name: string
  phone: string | null
  roles: { role: string }[]
  household?: { address: string; unit_number: string | null } | { address: string; unit_number: string | null }[]
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  dispatcher: 'bg-red-100 text-red-700',
  patroller: 'bg-blue-100 text-blue-700',
  fire_coordinator: 'bg-orange-100 text-orange-700',
  household_contact: 'bg-green-100 text-green-700',
  member: 'bg-gray-100 text-gray-600',
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/elijah/members')
      .then(r => r.json())
      .then(d => { setMembers(d.members || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-sm text-gray-500">{members.length} community members</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          <Plus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <UserCheck className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">No members registered yet</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Roles</th>
                <th className="px-5 py-3">Address</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map(m => {
                const household = Array.isArray(m.household) ? m.household[0] : m.household
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{m.display_name}</td>
                    <td className="px-5 py-3 text-gray-600">{m.phone || '--'}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {m.roles.map((r, i) => (
                          <span key={i} className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', ROLE_COLORS[r.role] || ROLE_COLORS.member)}>
                            {r.role.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {household ? `${household.address}${household.unit_number ? ` #${household.unit_number}` : ''}` : '--'}
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
