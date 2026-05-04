/**
 * app/(dashboard)/dashboard/settings/integrations/telegram/page.tsx
 * Telegram integration settings — generates one-time deep-link for telegram_user_id activation.
 * User clicks button → POST /api/integrations/telegram/auth-link → gets link →
 * opens t.me/Bot?start=auth_<token> → bot validates + upserts user_profiles.telegram_user_id.
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function TelegramIntegrationPage() {
  const [link, setLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/integrations/telegram/auth-link', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        setError(body.error ?? 'Failed to generate link')
        return
      }
      const { link: generatedLink } = await res.json()
      setLink(generatedLink)
    } catch (e: any) {
      setError(e.message ?? 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-semibold mb-2">Connect Telegram</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Link your Telegram account to receive approval requests directly in Telegram.
        Tap the button below, then open the link in Telegram. The link expires in 15 minutes.
      </p>

      <Button onClick={generate} disabled={loading}>
        {loading ? 'Generating...' : 'Connect Telegram'}
      </Button>

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      {link && (
        <div className="mt-4 p-3 border rounded-md bg-muted">
          <p className="text-xs text-muted-foreground mb-1">Open this link in Telegram:</p>
          <a
            href={link}
            className="underline text-sm break-all text-blue-600"
            target="_blank"
            rel="noreferrer"
          >
            {link}
          </a>
          <p className="text-xs text-muted-foreground mt-2">
            Expires in 15 minutes. Send the bot &quot;/auth&quot; if the link doesn&apos;t open automatically.
          </p>
        </div>
      )}
    </div>
  )
}
