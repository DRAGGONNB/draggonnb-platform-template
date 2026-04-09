'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RESTAURANT_ID, STAFF_ROLES } from '@/lib/restaurant/constants'
import {
  Loader2, Users, Plus, X, Phone, MessageCircle, Shield, UserCheck, ChefHat, Wine, Coffee,
} from 'lucide-react'

const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  manager: Shield, server: UserCheck, bartender: Wine, chef: ChefHat, host: Coffee,
}

const ROLE_COLORS: Record<string, { text: string; bg: string }> = {
  manager: { text: 'text-purple-700', bg: 'bg-purple-50' },
  server: { text: 'text-blue-700', bg: 'bg-blue-50' },
  bartender: { text: 'text-amber-700', bg: 'bg-amber-50' },
  chef: { text: 'text-red-700', bg: 'bg-red-50' },
  host: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
}

interface Staff {
  id: string
  display_name: string
  role: string
  phone: string | null
  whatsapp_number: string | null
  telegram_chat_id: string | null
  is_active: boolean
  employment_type: string
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  const fetchStaff = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('restaurant_staff')
      .select('id, display_name, role, phone, whatsapp_number, telegram_chat_id, is_active, employment_type')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('role')
      .order('display_name')
    setStaff(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchStaff() }, [fetchStaff])

  const filtered = filter === 'all' ? staff : staff.filter((s) => s.role === filter)
  const activeCount = staff.filter((s) => s.is_active).length

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[#0077B6]" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500 mt-1">{staff.length} members &middot; {activeCount} active</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0077B6] text-white text-sm font-medium hover:bg-[#006299]">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {/* Role filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
          All
        </button>
        {STAFF_ROLES.map((role) => {
          const rc = ROLE_COLORS[role]
          return (
            <button key={role} onClick={() => setFilter(role)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-colors ${filter === role ? `${rc.bg} ${rc.text} border-current` : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
              {role}
            </button>
          )
        })}
      </div>

      {/* Staff grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No staff found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((member) => {
            const rc = ROLE_COLORS[member.role] ?? { text: 'text-gray-700', bg: 'bg-gray-50' }
            const Icon = ROLE_ICONS[member.role] ?? Users
            return (
              <div key={member.id} className={`bg-white rounded-xl border border-gray-200 p-4 ${!member.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${rc.bg}`}>
                      <Icon className={`w-5 h-5 ${rc.text}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{member.display_name}</p>
                      <span className={`text-xs font-medium capitalize ${rc.text}`}>{member.role}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${member.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-gray-500">
                  {member.phone && (
                    <div className="flex items-center gap-1.5"><Phone size={12} />{member.phone}</div>
                  )}
                  {member.whatsapp_number && (
                    <div className="flex items-center gap-1.5"><MessageCircle size={12} />WhatsApp: {member.whatsapp_number}</div>
                  )}
                  <div className="flex items-center gap-1.5 capitalize">{member.employment_type}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add staff modal */}
      {showForm && <AddStaffModal onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); fetchStaff() }} />}
    </div>
  )
}

function AddStaffModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('server')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!name.trim()) { setError('Name is required'); return }
    setError('')
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.from('restaurant_staff').insert({
        restaurant_id: RESTAURANT_ID,
        organization_id: (await supabase.from('restaurants').select('organization_id').eq('id', RESTAURANT_ID).single()).data?.organization_id,
        display_name: name.trim(),
        role,
        phone: phone.trim() || null,
        employment_type: 'full_time',
        is_active: true,
      })
      if (err) { setError(err.message); setSubmitting(false); return }
      onCreated()
    } catch { setError('Failed to add staff'); setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Add Staff</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none capitalize">
              {STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone (optional)</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-4 py-2 rounded-lg bg-[#0077B6] text-white text-sm hover:bg-[#006299] disabled:opacity-50 flex items-center gap-2">
            {submitting && <Loader2 size={14} className="animate-spin" />} Add Staff
          </button>
        </div>
      </div>
    </div>
  )
}
