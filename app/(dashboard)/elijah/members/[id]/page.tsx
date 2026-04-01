'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, UserCheck, Phone, Home, Shield, Lock, AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface MemberDetail {
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

export default function MemberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [member, setMember] = useState<MemberDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [sensitiveRequested, setSensitiveRequested] = useState(false)
  const [sensitiveLoading, setSensitiveLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/elijah/members/${id}`)
      .then(r => r.json())
      .then(d => { setMember(d.member || null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const requestSensitiveAccess = async () => {
    setSensitiveLoading(true)
    try {
      await fetch(`/api/elijah/members/${id}/sensitive`, { method: 'POST' })
      setSensitiveRequested(true)
    } catch {
      // handle error silently
    } finally {
      setSensitiveLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
      </div>
    )
  }

  if (!member) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="rounded-xl border bg-white p-12 text-center">
          <UserCheck className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">Member not found</p>
        </div>
      </div>
    )
  }

  const household = Array.isArray(member.household) ? member.household[0] : member.household

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{member.display_name}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {member.roles.map((r, i) => (
            <span key={i} className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', ROLE_COLORS[r.role] || ROLE_COLORS.member)}>
              {r.role.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Member Info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border bg-white p-4">
          <Phone className="h-5 w-5 text-gray-400" />
          <div>
            <p className="text-xs font-medium text-gray-500">Phone</p>
            <p className="text-sm font-medium text-gray-900">{member.phone || 'Not provided'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-white p-4">
          <Home className="h-5 w-5 text-gray-400" />
          <div>
            <p className="text-xs font-medium text-gray-500">Household</p>
            <p className="text-sm font-medium text-gray-900">
              {household ? `${household.address}${household.unit_number ? ` #${household.unit_number}` : ''}` : 'Not assigned'}
            </p>
          </div>
        </div>
      </div>

      {/* Sensitive Profile Section */}
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Sensitive Profile</h2>
        </div>
        {sensitiveRequested ? (
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-sm text-green-700">Access request submitted. An admin will review your request.</p>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-gray-300" />
              <p className="text-sm text-gray-500">This section contains sensitive information and requires elevated access.</p>
            </div>
            <button
              onClick={requestSensitiveAccess}
              disabled={sensitiveLoading}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              {sensitiveLoading ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border border-gray-300 border-t-gray-600" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              Request Access
            </button>
          </div>
        )}
      </div>

      {/* Incident History Placeholder */}
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Incident History</h2>
        </div>
        <div className="rounded-lg bg-gray-50 p-4 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No incidents associated with this member</p>
        </div>
      </div>

      {/* Patrol History Placeholder */}
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Patrol History</h2>
        </div>
        <div className="rounded-lg bg-gray-50 p-4 text-center">
          <Clock className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No patrol assignments yet</p>
        </div>
      </div>
    </div>
  )
}
