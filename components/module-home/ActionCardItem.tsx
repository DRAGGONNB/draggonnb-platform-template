'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'
import type { ActionCardItem as ActionCardItemType, ApproveAction } from './types'

interface ActionCardItemProps {
  item: ActionCardItemType
  variant: 'followup' | 'stale_deal' | 'hot_lead' | 'generic'
  apiEndpoint: string
  onDismiss: () => void
  onApproveCommit: (action: ApproveAction) => void
}

interface PendingEntry {
  timer: ReturnType<typeof setTimeout>
  dismiss: () => void
}

export function ActionCardItem({
  item,
  variant,
  apiEndpoint,
  onDismiss,
  onApproveCommit,
}: ActionCardItemProps) {
  // pendingRef stores in-flight undo state — useRef avoids re-render thrash
  const pendingRef = useRef<Map<string, PendingEntry>>(new Map())
  const [decideOpen, setDecideOpen] = useState(false)
  const [decideChoice, setDecideChoice] = useState<'engage' | 'archive' | 'snooze'>('engage')

  function cancelAction(itemId: string) {
    const entry = pendingRef.current.get(itemId)
    if (!entry) return
    clearTimeout(entry.timer)
    entry.dismiss()
    pendingRef.current.delete(itemId)
  }

  function handleApprove(action: ApproveAction) {
    const { id: toastId, dismiss } = toast({
      title: 'Sending...',
      description: 'Tap Undo to cancel',
      action: (
        <ToastAction altText="Undo" onClick={() => cancelAction(item.id)}>
          Undo
        </ToastAction>
      ),
      duration: 5000,
    })

    const timer = setTimeout(async () => {
      pendingRef.current.delete(item.id)
      await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, action }),
      }).catch(() => {
        // Silent failure — parent state already updated optimistically
      })
      onApproveCommit(action)
    }, 5000)

    pendingRef.current.set(item.id, { timer, dismiss })
  }

  function handleDecideConfirm() {
    setDecideOpen(false)
    handleApprove({ type: 'decide', choice: decideChoice })
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm">
      {/* Entity info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.displayName}</p>
        {item.subtitle && (
          <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
        )}
      </div>

      {/* Action buttons by variant */}
      <div className="flex shrink-0 items-center gap-1.5">
        {variant === 'followup' && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleApprove({ type: 'send_email' })}
            >
              Send email
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleApprove({ type: 'snooze_1d' })}
            >
              Snooze 1d
            </Button>
          </>
        )}

        {variant === 'stale_deal' && (
          <>
            <Button size="sm" variant="outline" onClick={() => setDecideOpen(true)}>
              Decide
            </Button>
            <Dialog open={decideOpen} onOpenChange={setDecideOpen}>
              <DialogContent className="z-50 sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>What do you want to do?</DialogTitle>
                  <DialogDescription>
                    Choose an action for <strong>{item.displayName}</strong>
                  </DialogDescription>
                </DialogHeader>
                <RadioGroup
                  value={decideChoice}
                  onValueChange={(v) =>
                    setDecideChoice(v as 'engage' | 'archive' | 'snooze')
                  }
                  className="flex flex-col gap-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="engage" id={`engage-${item.id}`} />
                    <Label htmlFor={`engage-${item.id}`}>Engage</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="archive" id={`archive-${item.id}`} />
                    <Label htmlFor={`archive-${item.id}`}>Archive</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="snooze" id={`snooze-${item.id}`} />
                    <Label htmlFor={`snooze-${item.id}`}>Snooze</Label>
                  </div>
                </RadioGroup>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDecideOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleDecideConfirm}>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}

        {variant === 'hot_lead' && (
          <Button
            size="sm"
            variant="default"
            onClick={() => handleApprove({ type: 'engage_hot_lead' })}
          >
            Engage
          </Button>
        )}

        {variant === 'generic' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleApprove({ type: 'send_email' })}
          >
            Approve
          </Button>
        )}

        {/* Dismiss button */}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          ×
        </Button>
      </div>
    </li>
  )
}
