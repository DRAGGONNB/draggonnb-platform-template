'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { BrandSafetyBadge } from './BrandSafetyBadge'
import { Mail, MessageSquare, RotateCcw, ShieldCheck } from 'lucide-react'

export interface DraftData {
  id: string
  campaign_id: string
  channel: string
  subject: string | null
  body_text: string
  body_html: string | null
  brand_safe: boolean | null
  safety_flags: string[] | null
  is_approved: boolean
  regeneration_count: number
}

interface DraftCardProps {
  draft: DraftData
  onSafetyChecked?: (draftId: string, result: { brand_safe: boolean; safety_flags: string[] }) => void
  onRegenerated?: (draftId: string, updated: Partial<DraftData>) => void
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-3 w-3" />,
  sms: <MessageSquare className="h-3 w-3" />,
  facebook: <span className="text-[11px] font-bold">f</span>,
  instagram: <span className="text-[11px] font-bold">ig</span>,
  linkedin: <span className="text-[11px] font-bold">in</span>,
}

export function DraftCard({ draft, onSafetyChecked, onRegenerated }: DraftCardProps) {
  const [bodyText, setBodyText] = useState(draft.body_text)
  const [checkingBrandSafety, setCheckingBrandSafety] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [safetyError, setSafetyError] = useState<string | null>(null)
  const [brandSafe, setBrandSafe] = useState<boolean | null>(draft.brand_safe)
  const [safetyFlags, setSafetyFlags] = useState<string[]>(draft.safety_flags ?? [])

  async function handleCheckBrandSafety() {
    setCheckingBrandSafety(true)
    setSafetyError(null)
    try {
      const res = await fetch(
        `/api/campaigns/${draft.campaign_id}/drafts/${draft.id}/check-safety`,
        { method: 'POST' }
      )
      const json = await res.json()
      if (!res.ok) {
        setSafetyError(json.error ?? 'Safety check failed')
        return
      }
      setBrandSafe(json.safe)
      setSafetyFlags(json.flags?.map((f: { type: string }) => f.type) ?? [])
      onSafetyChecked?.(draft.id, { brand_safe: json.safe, safety_flags: json.flags?.map((f: { type: string }) => f.type) ?? [] })
    } catch {
      setSafetyError('Network error')
    } finally {
      setCheckingBrandSafety(false)
    }
  }

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      const res = await fetch(
        `/api/campaigns/${draft.campaign_id}/drafts/${draft.id}/regenerate`,
        { method: 'POST' }
      )
      const json = await res.json()
      if (!res.ok) return
      setBodyText(json.draft?.body_text ?? bodyText)
      setBrandSafe(null)
      setSafetyFlags([])
      onRegenerated?.(draft.id, json.draft)
    } catch {
      // silent
    } finally {
      setRegenerating(false)
    }
  }

  // PATCH on blur — stub (returns 501). Inline editor saves are v3.1 scope.
  // TODO(v3.1): implement PATCH /api/campaigns/[id]/drafts/[draftId] for inline saves.
  async function handleBlur() {
    if (bodyText === draft.body_text) return
    // Stub: PATCH endpoint returns 501 in current plan scope.
    // Body text changes are only persisted via approval screen edits.
  }

  return (
    <Card className="relative">
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
          <BrandSafetyBadge brandSafe={brandSafe} flags={safetyFlags} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          onBlur={handleBlur}
          rows={draft.channel === 'email' ? 6 : 4}
          className="text-sm resize-none"
          placeholder="Draft content..."
        />

        {safetyError && (
          <p className="text-xs text-red-500">{safetyError}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {brandSafe === null && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckBrandSafety}
              disabled={checkingBrandSafety}
            >
              <ShieldCheck className="h-3 w-3 mr-1" />
              {checkingBrandSafety ? 'Checking...' : 'Check brand safety'}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </Button>

          {draft.regeneration_count > 0 && (
            <span className="text-xs text-muted-foreground">
              Regenerated {draft.regeneration_count}x
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
