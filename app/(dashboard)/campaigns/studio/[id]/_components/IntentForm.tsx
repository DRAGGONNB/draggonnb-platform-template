'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export function IntentForm() {
  const router = useRouter()
  const [intent, setIntent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!intent.trim()) return

    setLoading(true)
    setError(null)

    try {
      // Derive a campaign name from the first 60 chars of intent
      const name = intent.trim().slice(0, 60)

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, intent: intent.trim(), channels: [] }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Failed to create campaign')
        return
      }

      router.push(`/campaigns/studio/${json.campaignId}`)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="intent">What do you want to promote?</Label>
        <Textarea
          id="intent"
          placeholder="e.g. promote our Sunday brunch special — 3-course R195, includes mimosa"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          rows={4}
          className="resize-none"
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Describe your campaign intent in plain language. We will generate drafts for all your active channels.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading || !intent.trim()}>
        {loading ? 'Creating campaign...' : 'Create campaign'}
      </Button>
    </form>
  )
}
