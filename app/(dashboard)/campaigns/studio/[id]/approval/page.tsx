export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ApprovalScreen } from './_components/ApprovalScreen'
import type { ChannelAccount } from './_components/PublishConfirmModal'
import type { ApprovalDraft } from './_components/ApprovalList'

async function resolveChannelAccounts(
  orgId: string,
  channels: string[]
): Promise<ChannelAccount[]> {
  const supabase = createAdminClient()
  const accounts: ChannelAccount[] = []

  for (const ch of channels) {
    if (ch === 'email') {
      accounts.push({ channelId: 'email', accountName: 'Resend (default org domain)' })
    } else if (ch === 'sms') {
      const senderId = process.env.BULKSMS_SENDER_ID ?? 'DraggonnB'
      accounts.push({ channelId: 'sms', accountName: `SMS via ${senderId} sender ID` })
    } else if (ch === 'facebook' || ch === 'instagram') {
      // social_accounts table — best-effort lookup, fall back to generic label
      const { data } = await supabase
        .from('social_accounts')
        .select('account_name, platform_id')
        .eq('organization_id', orgId)
        .eq('platform_id', ch)
        .limit(1)
        .maybeSingle()
      const name = data?.account_name ?? `${ch} account`
      accounts.push({ channelId: ch, accountName: `${ch.charAt(0).toUpperCase() + ch.slice(1)}: ${name}` })
    } else if (ch === 'linkedin') {
      const { data } = await supabase
        .from('social_accounts')
        .select('account_name')
        .eq('organization_id', orgId)
        .eq('platform_id', 'linkedin')
        .limit(1)
        .maybeSingle()
      const name = data?.account_name ?? 'LinkedIn account'
      accounts.push({ channelId: 'linkedin', accountName: `LinkedIn: ${name}` })
    }
  }

  return accounts
}

export default async function ApprovalPage({
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

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, name, status, channels, force_review')
    .eq('id', id)
    .eq('organization_id', userOrg.organizationId)
    .single()

  if (campaignError || !campaign) {
    notFound()
  }

  const { data: draftsRaw } = await supabase
    .from('campaign_drafts')
    .select('id, campaign_id, channel, subject, body_text, brand_safe, safety_flags, is_approved')
    .eq('campaign_id', id)
    .order('created_at', { ascending: true })

  const drafts: ApprovalDraft[] = (draftsRaw ?? []) as ApprovalDraft[]
  const channelList = (campaign.channels as string[]) ?? drafts.map((d) => d.channel)
  const uniqueChannels = [...new Set(channelList)]
  const channelAccounts = await resolveChannelAccounts(userOrg.organizationId, uniqueChannels)

  return (
    <div className="p-6 space-y-6">
      <div>
        <Link
          href={`/campaigns/studio/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to studio
        </Link>
        <h1 className="text-2xl font-bold">{campaign.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-muted-foreground text-sm">Review and approve all drafts before publishing.</p>
          {campaign.force_review && (
            <Badge variant="outline" className="text-amber-600 border-amber-400">
              Under review — scheduling requires admin sign-off
            </Badge>
          )}
        </div>
      </div>

      {drafts.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <p className="text-muted-foreground">No drafts yet.</p>
          <Link href={`/campaigns/studio/${id}`} className="mt-2 inline-block text-sm text-primary underline">
            Go back to studio and generate drafts
          </Link>
        </div>
      ) : (
        <ApprovalScreen
          campaignId={id}
          drafts={drafts}
          channelAccounts={channelAccounts}
        />
      )}
    </div>
  )
}
