'use client'

// app/(dashboard)/activate-trophy/activate-trophy-form.tsx
// Client island for the Trophy OS activation CTA.
// Calls POST /api/activate-trophy (server validates admin role + runs saga step).
// On success: bridges into Trophy via /api/sso/issue?target=trophy.

import { useState } from 'react'

export function ActivateTrophyForm() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleActivate = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/activate-trophy', { method: 'POST' })
      const data: { error?: string; ok?: boolean } = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Activation failed. Please try again.')
        setSubmitting(false)
        return
      }

      // Activation succeeded — bridge into Trophy.
      // The SSO issue route signs a bridge JWT and 302-redirects to Trophy.
      window.location.href = '/api/sso/issue?target=trophy'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error — please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div>
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-800 bg-red-950 p-3 text-sm text-red-300"
        >
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleActivate}
        disabled={submitting}
        className="rounded-md bg-[#B8941E] px-5 py-2.5 text-sm font-medium text-[#1E1B16] hover:bg-[#d4aa32] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-busy={submitting}
      >
        {submitting ? 'Activating…' : 'Activate Trophy OS'}
      </button>
    </div>
  )
}
