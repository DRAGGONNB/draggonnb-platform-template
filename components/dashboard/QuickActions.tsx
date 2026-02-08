'use client'

import { useRouter } from 'next/navigation'

export function QuickActions() {
  const router = useRouter()

  return (
    <div className="space-y-3">
      <button
        onClick={() => router.push('/dashboard/generate')}
        className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5"
      >
        + Generate Post
      </button>
      <button
        onClick={() => router.push('/crm/contacts')}
        className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5"
      >
        + Add Contact
      </button>
      <button
        onClick={() => router.push('/calendar')}
        className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5"
      >
        + Schedule Content
      </button>
    </div>
  )
}
