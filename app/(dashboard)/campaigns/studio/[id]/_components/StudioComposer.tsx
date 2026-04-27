'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChannelSelector } from './ChannelSelector'
import type { ChannelConfig } from './ChannelSelector'
import { DraftCard } from './DraftCard'
import type { DraftData } from './DraftCard'
import { Wand2 } from 'lucide-react'

interface StudioComposerProps {
  campaignId: string
  channelConfig: ChannelConfig[]
  initialChannels: string[]
  initialDrafts: DraftData[]
}

export function StudioComposer({
  campaignId,
  channelConfig,
  initialChannels,
  initialDrafts,
}: StudioComposerProps) {
  const [selectedChannels, setSelectedChannels] = useState<string[]>(initialChannels)
  const [drafts, setDrafts] = useState<DraftData[]>(initialDrafts)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerateDrafts() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: selectedChannels }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to generate drafts')
        return
      }
      setDrafts(json.drafts ?? [])
    } catch {
      setError('Network error — please try again')
    } finally {
      setGenerating(false)
    }
  }

  function handleSafetyChecked(
    draftId: string,
    result: { brand_safe: boolean; safety_flags: string[] }
  ) {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId
          ? { ...d, brand_safe: result.brand_safe, safety_flags: result.safety_flags }
          : d
      )
    )
  }

  function handleRegenerated(draftId: string, updated: Partial<DraftData>) {
    setDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, ...updated, brand_safe: null, safety_flags: [] } : d))
    )
  }

  return (
    <div className="space-y-6">
      {/* Channel selector */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Channels</p>
        <p className="text-xs text-muted-foreground">
          Select which channels to include. Greyed channels require credentials to enable.
        </p>
        <ChannelSelector
          channels={channelConfig}
          selected={selectedChannels}
          onChange={setSelectedChannels}
        />
      </div>

      {/* Generate drafts */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleGenerateDrafts}
          disabled={generating}
          className="flex items-center gap-2"
        >
          <Wand2 className="h-4 w-4" />
          {generating
            ? 'Generating drafts... (~30-60s)'
            : drafts.length > 0
            ? 'Regenerate all drafts'
            : 'Generate drafts'}
        </Button>
        {drafts.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {drafts.length} draft{drafts.length !== 1 ? 's' : ''} generated
          </span>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      {/* Draft cards */}
      {drafts.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium">Drafts</p>
          <div className="grid gap-4 md:grid-cols-2">
            {drafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                onSafetyChecked={handleSafetyChecked}
                onRegenerated={handleRegenerated}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
