import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { CampaignDrafterAgent } from '@/lib/campaigns/agent/campaign-drafter'
import { AgentCreditError, AgentRateLimitError } from '@/lib/agents/base-agent'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params

  // Auth
  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = userOrg.organizationId
  const supabase = createAdminClient()

  // Verify campaign ownership
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, intent, organization_id')
    .eq('id', campaignId)
    .eq('organization_id', orgId)
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // Kill switch check (inline — DO NOT import from lib/campaigns/kill-switch.ts; built in Plan 11-11)
  const { data: tenantMod } = await supabase
    .from('tenant_modules')
    .select('config')
    .eq('organization_id', orgId)
    .eq('module_id', 'campaigns')
    .maybeSingle()
  type CampaignsConfig = { campaigns?: { kill_switch_active?: boolean } }
  if (((tenantMod?.config as CampaignsConfig | null)?.campaigns?.kill_switch_active)) {
    return NextResponse.json({ error: 'Campaigns are paused' }, { status: 423 })
  }

  // Pre-clear existing drafts for this campaign (regeneration replaces all)
  const { error: deleteError } = await supabase
    .from('campaign_drafts')
    .delete()
    .eq('campaign_id', campaignId)

  if (deleteError) {
    console.error('drafts POST: failed to clear existing drafts', deleteError)
    return NextResponse.json({ error: 'Failed to clear previous drafts' }, { status: 500 })
  }

  // Invoke CampaignDrafterAgent — brand voice injected automatically by BaseAgent
  let agentResult
  try {
    const agent = new CampaignDrafterAgent()
    agentResult = await agent.run({
      organizationId: orgId,
      input: campaign.intent as string,
    })
  } catch (err) {
    console.error('drafts POST: CampaignDrafterAgent failed', err)
    if (err instanceof AgentCreditError) {
      return NextResponse.json({ error: err.userMessage }, { status: 503 })
    }
    if (err instanceof AgentRateLimitError) {
      return NextResponse.json({ error: err.userMessage }, { status: 429 })
    }
    return NextResponse.json({ error: 'Draft generation failed — please try again' }, { status: 500 })
  }

  const draftResult = agentResult?.result as { posts?: Array<{ channel: string; subject?: string; bodyText: string; bodyHtml?: string }> } | undefined
  if (!draftResult?.posts) {
    return NextResponse.json({ error: 'Agent returned empty result' }, { status: 500 })
  }

  // Insert drafts
  const now = new Date().toISOString()
  const rows = draftResult.posts.map((post) => ({
    campaign_id: campaignId,
    organization_id: orgId,
    channel: post.channel,
    subject: post.subject ?? null,
    body_text: post.bodyText,
    body_html: post.bodyHtml ?? null,
    brand_safe: null as boolean | null,
    safety_flags: [] as string[],
    is_approved: false,
    regeneration_count: 0,
    agent_session_id: (agentResult as { sessionId?: string }).sessionId ?? null,
    created_at: now,
    updated_at: now,
  }))

  const { data: insertedDrafts, error: insertError } = await supabase
    .from('campaign_drafts')
    .insert(rows)
    .select(
      'id, campaign_id, channel, subject, body_text, body_html, brand_safe, safety_flags, is_approved, regeneration_count'
    )

  if (insertError) {
    console.error('drafts POST: insert failed', insertError)
    return NextResponse.json({ error: 'Failed to save drafts' }, { status: 500 })
  }

  return NextResponse.json({ drafts: insertedDrafts ?? [] })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params
  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Verify ownership first
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('organization_id', userOrg.organizationId)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('campaign_drafts')
    .select(
      'id, campaign_id, channel, subject, body_text, body_html, brand_safe, safety_flags, is_approved, regeneration_count'
    )
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 })
  }

  return NextResponse.json({ drafts: data ?? [] })
}

// PATCH stub — inline draft edit-on-blur is v3.1 scope
// TODO(v3.1): implement inline draft body_text save on blur
export async function PATCH(_request: Request) {
  return NextResponse.json({ error: 'Inline draft editing pending v3.1' }, { status: 501 })
}
