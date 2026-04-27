'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { BrandSafetyBadge } from '../../_components/BrandSafetyBadge'
import { Check, X, RotateCcw, ShieldCheck, Mail, MessageSquare } from 'lucide-react'

export interface ApprovalDraft {
  id: string
  campaign_id: string
  channel: string
  subject: string | null
  body_text: string
  brand_safe: boolean | null
  safety_flags: string[] | null
  is_approved: boolean
}

interface ApprovalListProps {
  drafts: ApprovalDraft[]
  onApproveAll: () => void
  onOpenPublishModal: () => void
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-3 w-3" />,
  sms: <MessageSquare className="h-3 w-3" />,
}

export function ApprovalList({ drafts, onApproveAll, onOpenPublishModal }: ApprovalListProps) {
  const [draftStates, setDraftStates] = useState<Record<string, ApprovalDraft>>(
    Object.fromEntries(drafts.map((d) => [d.id, d]))
  )
  const [checkingDrafts, setCheckingDrafts] = useState<Set<string>>(new Set())
  const [regenerating, setRegenerating] = useState<Set<string>>(new Set())

  const allApproved = Object.values(draftStates).every((d) => d.is_approved)

  function toggleApproved(draftId: string) {
    setDraftStates((prev) => ({
      ...prev,
      [draftId]: { ...prev[draftId], is_approved: !prev[draftId].is_approved },
    }))
  }

  function handleApproveAll() {
    setDraftStates((prev) =>
      Object.fromEntries(Object.entries(prev).map(([id, d]) => [id, { ...d, is_approved: true }]))
    )
    onApproveAll()
  }

  async function handleCheckBrandSafety(draft: ApprovalDraft) {
    setCheckingDrafts((prev) => new Set(prev).add(draft.id))
    try {
      const res = await fetch(
        `/api/campaigns/${draft.campaign_id}/drafts/${draft.id}/check-safety`,
        { method: 'POST' }
      )
      const json = await res.json()
      if (res.ok) {
        setDraftStates((prev) => ({
          ...prev,
          [draft.id]: {
            ...prev[draft.id],
            brand_safe: json.safe,
            safety_flags: json.flags?.map((f: { type: string }) => f.type) ?? [],
          },
        }))
      }
    } finally {
      setCheckingDrafts((prev) => {
        const next = new Set(prev)
        next.delete(draft.id)
        return next
      })
    }
  }

  async function handleRegenerate(draft: ApprovalDraft) {
    setRegenerating((prev) => new Set(prev).add(draft.id))
    try {
      const res = await fetch(
        `/api/campaigns/${draft.campaign_id}/drafts/${draft.id}/regenerate`,
        { method: 'POST' }
      )
      const json = await res.json()
      if (res.ok && json.draft) {
        setDraftStates((prev) => ({
          ...prev,
          [draft.id]: {
            ...prev[draft.id],
            body_text: json.draft.body_text ?? prev[draft.id].body_text,
            subject: json.draft.subject ?? prev[draft.id].subject,
            brand_safe: null,
            safety_flags: [],
            is_approved: false,
          },
        }))
      }
    } finally {
      setRegenerating((prev) => {
        const next = new Set(prev)
        next.delete(draft.id)
        return next
      })
    }
  }

  function handleBodyChange(draftId: string, text: string) {
    setDraftStates((prev) => ({
      ...prev,
      [draftId]: { ...prev[draftId], body_text: text },
    }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {Object.values(draftStates).filter((d) => d.is_approved).length} of{' '}
          {Object.values(draftStates).length} drafts approved
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleApproveAll}>
            <Check className="h-3 w-3 mr-1" />
            Approve all
          </Button>
          <Button
            size="sm"
            onClick={onOpenPublishModal}
            disabled={!allApproved}
            title={!allApproved ? 'Approve all drafts first' : undefined}
          >
            Approve campaign
          </Button>
        </div>
      </div>

      {Object.values(draftStates).map((draft) => (
        <Card
          key={draft.id}
          className={draft.is_approved ? 'border-green-300 bg-green-50/30' : undefined}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize flex items-center gap-1">
                  {CHANNEL_ICONS[draft.channel] ?? null}
                  {draft.channel}
                </Badge>
                {draft.subject && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {draft.subject}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <BrandSafetyBadge brandSafe={draft.brand_safe} flags={draft.safety_flags ?? []} />
                {draft.is_approved && (
                  <Badge className="bg-green-600 text-xs">Approved</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={draft.body_text}
              onChange={(e) => handleBodyChange(draft.id, e.target.value)}
              rows={4}
              className="text-sm resize-none"
            />

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={draft.is_approved ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleApproved(draft.id)}
                className={draft.is_approved ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <Check className="h-3 w-3 mr-1" />
                {draft.is_approved ? 'Approved' : 'Approve'}
              </Button>

              {draft.is_approved && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleApproved(draft.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  <X className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              )}

              {draft.brand_safe === null && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCheckBrandSafety(draft)}
                  disabled={checkingDrafts.has(draft.id)}
                >
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  {checkingDrafts.has(draft.id) ? 'Checking...' : 'Check brand safety'}
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRegenerate(draft)}
                disabled={regenerating.has(draft.id)}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                {regenerating.has(draft.id) ? 'Regenerating...' : 'Regenerate'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
