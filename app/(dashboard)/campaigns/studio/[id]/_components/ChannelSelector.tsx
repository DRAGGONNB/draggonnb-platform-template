'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// Sheet is not in components/ui yet — inline a simple drawer using dialog
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export interface ChannelConfig {
  id: string
  label: string
  enabled: boolean
  ctaText?: string
}

interface ChannelSelectorProps {
  channels: ChannelConfig[]
  selected: string[]
  onChange: (selected: string[]) => void
}

export function ChannelSelector({ channels, selected, onChange }: ChannelSelectorProps) {
  const [lockedChannel, setLockedChannel] = useState<ChannelConfig | null>(null)

  function toggleChannel(channelId: string) {
    if (selected.includes(channelId)) {
      onChange(selected.filter((id) => id !== channelId))
    } else {
      onChange([...selected, channelId])
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {channels.map((ch) => {
          const isSelected = selected.includes(ch.id)
          const isDisabled = !ch.enabled

          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => {
                if (isDisabled) {
                  setLockedChannel(ch)
                } else {
                  toggleChannel(ch.id)
                }
              }}
              className={[
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors',
                isDisabled
                  ? 'opacity-40 cursor-not-allowed border-dashed border-muted-foreground text-muted-foreground'
                  : isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:border-primary hover:text-primary',
              ].join(' ')}
              aria-disabled={isDisabled}
            >
              {ch.label}
              {isDisabled && ch.ctaText && (
                <Badge variant="outline" className="text-[10px] h-4 px-1 ml-1">
                  {ch.ctaText}
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {/* Locked channel Sheet (using Dialog as Sheet equivalent) */}
      <Dialog open={lockedChannel !== null} onOpenChange={(open) => !open && setLockedChannel(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Connect {lockedChannel?.label}</DialogTitle>
            <DialogDescription>
              The studio is there — social channels activate when Meta approves your account.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-3">
            <p>
              Your <span className="font-medium">{lockedChannel?.label}</span> channel will be
              available once your account credentials are configured by your platform administrator.
            </p>
            <p>
              Email and SMS channels are active now. Social channels (Facebook, Instagram, LinkedIn)
              are credential-gated and activate as integrations are approved.
            </p>
          </div>
          <Button variant="outline" onClick={() => setLockedChannel(null)} className="w-full">
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
