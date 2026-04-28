import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { CampaignDrafterAgent } from '@/lib/campaigns/agent/campaign-drafter'
import { AgentCreditError, AgentRateLimitError } from '@/lib/agents/base-agent'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; draftId: string }> }
) {
  const { id: campaignId, draftId } = await params

  // Auth
  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = userOrg.organizationId
  const supabase = createAdminClient()

  // Verify campaign ownership and fetch intent
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, intent, organization_id')
    .eq('id', campaignId)
    .eq('organization_id', orgId)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // Fetch the draft to regenerate
  const { data: draft } = await supabase
    .from('campaign_drafts')
    .select('id, channel, regeneration_count')
    .eq('id', draftId)
    .eq('campaign_id', campaignId)
    .single()

  if (!draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }

  // Re-run CampaignDrafterAgent with regeneration instruction
  const regenerateInput = `${campaign.intent as string}\n\nRegenerate the ${draft.channel as string} post — make it different from the previous version.`

  let agentResult
  try {
    const agent = new CampaignDrafterAgent()
    agentResult = await agent.run({
      organizationId: orgId,
      input: regenerateInput,
    })
  } catch (err) {
    console.error('regenerate: CampaignDrafterAgent failed', err)
    if (err instanceof AgentCreditError) {
      return NextResponse.json({ error: err.userMessage }, { status: 503 })
    }
    if (err instanceof AgentRateLimitError) {
      return NextResponse.json({ error: err.userMessage }, { status: 429 })
    }
    return NextResponse.json({ error: 'Regeneration failed — please try again' }, { status: 500 })
  }

  const draftResult = agentResult?.result as {
    posts?: Array<{ channel: string; subject?: string; bodyText: string; bodyHtml?: string }>
  } | undefined

  // Find the matching channel post from the result
  const matchingPost = draftResult?.posts?.find((p) => p.channel === draft.channel) ?? draftResult?.posts?.[0]

  if (!matchingPost) {
    return NextResponse.json({ error: 'Agent returned no matching post' }, { status: 500 })
  }

  const now = new Date().toISOString()
  const { data: updatedDraft, error: updateError } = await supabase
    .from('campaign_drafts')
    .update({
      body_text: matchingPost.bodyText,
      body_html: matchingPost.bodyHtml ?? null,
      subject: matchingPost.subject ?? null,
      brand_safe: null,
      safety_flags: [],
      is_approved: false,
      regeneration_count: ((draft.regeneration_count as number) ?? 0) + 1,
      updated_at: now,
    })
    .eq('id', draftId)
    .select('id, campaign_id, channel, subject, body_text, body_html, brand_safe, safety_flags, is_approved, regeneration_count')
    .single()

  if (updateError || !updatedDraft) {
    console.error('regenerate: update error', updateError)
    return NextResponse.json({ error: 'Failed to save regenerated draft' }, { status: 500 })
  }

  return NextResponse.json({ draft: updatedDraft })
}
