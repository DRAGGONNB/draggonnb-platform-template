'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, MessageSquare } from 'lucide-react'

export interface ChannelAccount {
  channelId: string
  accountName: string
}

export interface PublishDraftPreview {
  id: string
  channel: string
  body_text: string
  subject?: string | null
}

interface PublishConfirmModalProps {
  open: boolean
  onClose: () => void
  campaignId: string
  channelAccounts: ChannelAccount[]
  drafts: PublishDraftPreview[]
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
  facebook: <span className="text-sm font-bold">f</span>,
  instagram: <span className="text-sm font-bold">ig</span>,
  linkedin: <span className="text-sm font-bold">in</span>,
}

export function PublishConfirmModal({
  open,
  onClose,
  campaignId,
  channelAccounts,
  drafts,
}: PublishConfirmModalProps) {
  const router = useRouter()
  const [scheduling, setScheduling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accountMap = Object.fromEntries(
    channelAccounts.map((a) => [a.channelId, a.accountName])
  )

  async function handleSchedule() {
    setScheduling(true)
    setError(null)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/approve`, {
        method: 'POST',
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Failed to approve campaign')
        return
      }

      onClose()
      router.push('/campaigns')
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setScheduling(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm campaign publish</DialogTitle>
          <DialogDescription>
            Review the content that will be sent on each channel before scheduling.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {drafts.map((draft) => {
            const accountName = accountMap[draft.channel] ?? draft.channel
            const preview = draft.body_text.slice(0, 200)
            const truncated = draft.body_text.length > 200

            return (
              <div key={draft.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {CHANNEL_ICONS[draft.channel] ?? null}
                  </span>
                  <Badge variant="outline" className="capitalize text-xs">
                    {draft.channel}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{accountName}</span>
                </div>
                {draft.subject && (
                  <p className="text-xs font-medium">Subject: {draft.subject}</p>
                )}
                <p className="text-xs text-muted-foreground bg-muted rounded px-2 py-1.5">
                  {preview}
                  {truncated && '...'}
                </p>
              </div>
            )
          })}
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSchedule} disabled={scheduling} className="flex-1">
            {scheduling ? 'Scheduling...' : 'Schedule'}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={scheduling}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
