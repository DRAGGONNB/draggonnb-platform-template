// Phase 11: POST /api/campaigns/[id]/schedule
// Enforces CAMP-08 (30-day draft-then-review), creates campaign_runs + campaign_run_items,
// schedules pg_cron job via scheduleCampaignRun(). (Plan 11-11 Task 1)

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { isInNewTenantPeriod } from '@/lib/campaigns/enforcement'
import { isKillSwitchActive } from '@/lib/campaigns/kill-switch'
import { scheduleCampaignRun } from '@/lib/campaigns/scheduler'

const ScheduleSchema = z.object({
  scheduledAt: z.string().datetime({ message: 'scheduledAt must be an ISO 8601 datetime string' }),
})

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

  // Body validation
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = ScheduleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const orgId = userOrg.organizationId
  const supabase = createAdminClient()
  const scheduledAt = new Date(parsed.data.scheduledAt)

  // Prevent scheduling in the past
  if (scheduledAt <= new Date()) {
    return NextResponse.json({ error: 'scheduledAt must be in the future' }, { status: 422 })
  }

  // Kill switch check
  const killActive = await isKillSwitchActive(supabase, orgId)
  if (killActive) {
    return NextResponse.json({ error: 'Campaigns are paused for this account' }, { status: 423 })
  }

  // Load campaign + verify ownership
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, status, force_review, organization_id, name, channels')
    .eq('id', campaignId)
    .eq('organization_id', orgId)
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // Campaign must be in 'pending_review' or 'scheduled' status (set by approve route in 11-10)
  if (!['pending_review', 'scheduled', 'draft'].includes(campaign.status as string)) {
    return NextResponse.json(
      { error: `Campaign cannot be scheduled from status '${campaign.status}'. Must be approved first.` },
      { status: 422 }
    )
  }

  // Load approved drafts
  const { data: drafts, error: draftsError } = await supabase
    .from('campaign_drafts')
    .select('id, channel, body_text, body_html, subject, is_approved, brand_safe')
    .eq('campaign_id', campaignId)

  if (draftsError) {
    return NextResponse.json({ error: 'Failed to load campaign drafts' }, { status: 500 })
  }

  if (!drafts || drafts.length === 0) {
    return NextResponse.json({ error: 'No drafts found for this campaign' }, { status: 422 })
  }

  const approvedDrafts = drafts.filter((d) => d.is_approved === true)
  if (approvedDrafts.length === 0) {
    return NextResponse.json({ error: 'No approved drafts — approve all drafts before scheduling' }, { status: 422 })
  }

  // 30-day enforcement (CAMP-08)
  const inPeriod = await isInNewTenantPeriod(orgId)
  if (inPeriod && !(campaign.force_review as boolean)) {
    return NextResponse.json(
      {
        error: 'In guided period — admin review required before scheduling. Campaign is queued as draft.',
        code: 'CAMP_08_GUIDED_PERIOD',
        hint: 'A platform_admin must set force_review=true on this campaign to bypass the 30-day review gate.',
      },
      { status: 422 }
    )
  }

  // Create campaign_runs row
  const { data: run, error: runError } = await supabase
    .from('campaign_runs')
    .insert({
      campaign_id: campaignId,
      organization_id: orgId,
      status: 'pending',
      scheduled_at: scheduledAt.toISOString(),
      items_total: approvedDrafts.length,
      items_sent: 0,
      items_failed: 0,
    })
    .select('id')
    .single()

  if (runError || !run) {
    console.error('[schedule] campaign_runs insert error:', runError)
    return NextResponse.json({ error: 'Failed to create campaign run' }, { status: 500 })
  }

  // Create campaign_run_items for each approved draft
  const items = approvedDrafts.map((draft) => ({
    run_id: run.id,
    campaign_draft_id: draft.id,
    channel: draft.channel,
    status: 'pending' as const,
    // recipient_ref: resolved per channel at execute time from draft body or org config
    // Left null here — execute route resolves from draft.body_text / org channel config
    recipient_ref: null,
  }))

  const { error: itemsError } = await supabase.from('campaign_run_items').insert(items)
  if (itemsError) {
    // Rollback the run row
    await supabase.from('campaign_runs').delete().eq('id', run.id)
    console.error('[schedule] campaign_run_items insert error:', itemsError)
    return NextResponse.json({ error: 'Failed to create run items' }, { status: 500 })
  }

  // Schedule the pg_cron job
  try {
    await scheduleCampaignRun(run.id, scheduledAt)
  } catch (err) {
    // Rollback items + run if pg_cron scheduling fails
    await supabase.from('campaign_run_items').delete().eq('run_id', run.id)
    await supabase.from('campaign_runs').delete().eq('id', run.id)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[schedule] scheduleCampaignRun failed:', msg)
    return NextResponse.json({ error: `Failed to schedule run: ${msg}` }, { status: 500 })
  }

  // Update campaign status to 'scheduled' + set published_at = scheduledAt
  const now = new Date().toISOString()
  await supabase
    .from('campaigns')
    .update({
      status: 'scheduled',
      scheduled_at: scheduledAt.toISOString(),
      published_at: scheduledAt.toISOString(),
      updated_at: now,
    })
    .eq('id', campaignId)

  return NextResponse.json({ runId: run.id, scheduledAt: scheduledAt.toISOString() }, { status: 200 })
}
