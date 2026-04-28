import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { BrandSafetyAgent } from '@/lib/campaigns/agent/brand-safety-checker'

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

  // Verify campaign ownership
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name, organization_id')
    .eq('id', campaignId)
    .eq('organization_id', orgId)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // Fetch draft
  const { data: draft } = await supabase
    .from('campaign_drafts')
    .select('id, campaign_id, channel, body_text')
    .eq('id', draftId)
    .eq('campaign_id', campaignId)
    .single()

  if (!draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }

  // Budget check: 20/day per org (RESEARCH B section 8)
  const today = new Date().toISOString().slice(0, 10)
  const { count } = await supabase
    .from('ai_usage_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('agent_type', 'campaign_brand_safety')
    .gte('created_at', today)

  const dailyLimit = 20 // TODO(v3.1): read from tenant_modules.config.campaigns.safety_check_daily_limit

  if ((count ?? 0) >= dailyLimit) {
    return NextResponse.json(
      { error: `Brand safety check limit reached for today (${dailyLimit}/day)` },
      { status: 429 }
    )
  }

  // Run brand safety agent
  let agentResult
  try {
    const agent = new BrandSafetyAgent()
    agentResult = await agent.run({
      organizationId: orgId,
      input: draft.body_text as string,
    })
  } catch (err) {
    console.error('check-safety: BrandSafetyAgent failed', err)
    return NextResponse.json({ error: 'Brand safety check failed — please try again' }, { status: 500 })
  }

  const safetyResult = agentResult?.result as {
    safe: boolean
    flags: Array<{ type: string; reason: string; excerpt?: string }>
    recommendation: string
  } | undefined

  if (!safetyResult) {
    return NextResponse.json({ error: 'Agent returned empty result' }, { status: 500 })
  }

  const flagTypes = safetyResult.flags.map((f) => f.type)

  // Persist result to campaign_drafts
  const { error: updateError } = await supabase
    .from('campaign_drafts')
    .update({
      brand_safe: safetyResult.safe,
      safety_flags: flagTypes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', draftId)

  if (updateError) {
    console.error('check-safety: update error', updateError)
    // Non-fatal — return result even if persist fails
  }

  // Telegram alert on 'reject' recommendation
  if (safetyResult.recommendation === 'reject') {
    try {
      const firstFlag = safetyResult.flags[0]
      await sendCampaignBrandSafetyAlert({
        orgName: userOrg.organization.name,
        campaignName: campaign.name as string,
        channel: draft.channel as string,
        flag: firstFlag?.type ?? 'unknown',
        reason: firstFlag?.reason ?? '',
      })
    } catch (alertErr) {
      // Non-fatal — alert failure must not block the response
      console.error('check-safety: Telegram alert failed', alertErr)
    }
  }

  return NextResponse.json({
    safe: safetyResult.safe,
    flags: safetyResult.flags,
    recommendation: safetyResult.recommendation,
  })
}

// ---------------------------------------------------------------------------
// Inline Telegram alert helper
// Mirrors sendOperatorAlert() pattern from lib/accommodation/telegram/ops-bot.ts
// Full helper with campaign-specific wording per RESEARCH B section 12(b)
// ---------------------------------------------------------------------------

interface BrandSafetyAlertParams {
  orgName: string
  campaignName: string
  channel: string
  flag: string
  reason: string
}

async function sendCampaignBrandSafetyAlert(params: BrandSafetyAlertParams): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_OPS_CHAT_ID
  if (!botToken || !chatId) return

  const message = [
    '🚨 *Brand Safety Alert*',
    '',
    `*Organisation:* ${escapeMarkdown(params.orgName)}`,
    `*Campaign:* ${escapeMarkdown(params.campaignName)}`,
    `*Channel:* ${params.channel}`,
    `*Flag:* ${params.flag.replace(/_/g, ' ')}`,
    `*Reason:* ${escapeMarkdown(params.reason)}`,
    '',
    'Recommendation: *REJECT* — campaign draft requires human review before scheduling.',
  ].join('\n')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')
}

