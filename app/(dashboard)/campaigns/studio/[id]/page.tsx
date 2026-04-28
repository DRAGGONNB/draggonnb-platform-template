export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChannelSelector } from './_components/ChannelSelector'
import type { ChannelConfig } from './_components/ChannelSelector'
import { StudioComposer } from './_components/StudioComposer'
import type { DraftData } from './_components/DraftCard'

// Determine which channels are enabled based on environment credentials
function buildChannelConfig(): ChannelConfig[] {
  return [
    {
      id: 'email',
      label: 'Email',
      enabled: !!process.env.RESEND_API_KEY,
    },
    {
      id: 'sms',
      label: 'SMS',
      enabled: !!process.env.BULKSMS_TOKEN_ID,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      enabled: !!process.env.META_APP_ID,
      ctaText: 'Connect Facebook to enable',
    },
    {
      id: 'instagram',
      label: 'Instagram',
      enabled: !!process.env.META_APP_ID,
      ctaText: 'Connect Instagram to enable',
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      enabled: !!process.env.LINKEDIN_CLIENT_ID,
      ctaText: 'Connect LinkedIn to enable',
    },
  ]
}

export default async function StudioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: userOrg, error: authError } = await getUserOrg()

  if (authError || !userOrg) {
    return (
      <div className="p-6">
        <p className="text-red-500">Authentication error: {authError}</p>
      </div>
    )
  }

  const supabase = createAdminClient()

  // Fetch campaign — verify org ownership
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, name, status, intent, channels, force_review, created_at')
    .eq('id', id)
    .eq('organization_id', userOrg.organizationId)
    .single()

  if (campaignError || !campaign) {
    notFound()
  }

  // Fetch existing drafts
  const { data: draftsRaw } = await supabase
    .from('campaign_drafts')
    .select(
      'id, campaign_id, channel, subject, body_text, body_html, brand_safe, safety_flags, is_approved, regeneration_count'
    )
    .eq('campaign_id', id)
    .order('created_at', { ascending: true })

  const drafts: DraftData[] = (draftsRaw ?? []) as DraftData[]
  const channelConfig = buildChannelConfig()
  const hasDrafts = drafts.length > 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to campaigns
          </Link>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="capitalize">
              {campaign.status?.replace('_', ' ')}
            </Badge>
            {campaign.force_review && (
              <Badge variant="outline" className="text-amber-600 border-amber-400">
                Under review
              </Badge>
            )}
          </div>
        </div>

        {hasDrafts && (
          <Link href={`/campaigns/studio/${id}/approval`}>
            <Button>
              Review &amp; approve
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        )}
      </div>

      {/* Intent display */}
      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Campaign intent</p>
        <p className="text-sm">{campaign.intent}</p>
      </div>

      {/* Studio composer (client island) */}
      <StudioComposer
        campaignId={id}
        channelConfig={channelConfig}
        initialChannels={(campaign.channels as string[]) ?? []}
        initialDrafts={drafts}
      />
    </div>
  )
}
