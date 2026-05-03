'use client'
// app/sso/consume/page.tsx
// SSO-04: reads URL fragment, POSTs token to /api/sso/validate, calls supabase.auth.setSession.
// This is the DESTINATION page when a Trophy user is bridged INTO DraggonnB.
// Token is NEVER in the query string — fragments are client-only and don't appear in server logs.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Stage = 'extracting' | 'validating' | 'setting-session' | 'redirecting'

export default function SSOConsumePage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage>('extracting')

  useEffect(() => {
    const run = async () => {
      try {
        // Extract token from URL fragment (window.location.hash is never sent to servers)
        const hash = window.location.hash.slice(1)
        const params = new URLSearchParams(hash)
        const token = params.get('token')
        if (!token) {
          setError('No bridge token found in URL')
          return
        }

        setStage('validating')
        const res = await fetch('/api/sso/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Bridge validation failed')
          return
        }

        setStage('setting-session')
        const supabase = createClient()
        const { error: setErr } = await supabase.auth.setSession({
          access_token: data.access_token as string,
          refresh_token: data.refresh_token as string,
        })
        if (setErr) {
          setError(`Session setup failed: ${setErr.message}`)
          return
        }

        // Clear the fragment from browser history to remove token
        window.history.replaceState(null, '', window.location.pathname)

        setStage('redirecting')
        router.replace((data.redirectTo as string) || '/dashboard')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unexpected error during SSO bridge')
      }
    }
    run()
  }, [router])

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold text-red-700">Sign-in failed</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <a
            href="/login"
            className="mt-4 inline-block rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            Back to sign in
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        <p className="mt-4 text-sm text-slate-600">Signing you in...</p>
        <p className="mt-1 text-xs text-slate-400">{stage}</p>
      </div>
    </main>
  )
}
