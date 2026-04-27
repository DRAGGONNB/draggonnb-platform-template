// Phase 11: POST /api/campaigns/execute — HMAC-authenticated pg_net execution endpoint (CAMP-03).
// Called by pg_cron via pg_net at the scheduled time. NOT called by users directly.
// Security: validates x-internal-hmac header (HMAC-SHA256 of run_id with INTERNAL_HMAC_SECRET).

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateInternalHmac, scheduleVerifyJob } from '@/lib/campaigns/scheduler'
import { isKillSwitchActive } from '@/lib/campaigns/kill-switch'
import { sendCampaignFailureAlert } from '@/lib/campaigns/telegram-alerts'
import { getAdapter } from '@/lib/campaigns/adapters'
import type { ChannelId, CampaignDraftPayload } from '@/lib/campaigns/adapters'

export async function POST(request: Request) {
  // Parse body early to get run_id for HMAC validation
  let runId: string | undefined
  try {
    const body = (await request.json()) as { run_id?: string }
    runId = body.run_id
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!runId) {
    return NextResponse.json({ error: 'run_id is required' }, { status: 400 })
  }

  // HMAC validation — reject if missing or incorrect
  const receivedHmac = request.headers.get('x-internal-hmac')
  if (!validateInternalHmac(runId, receivedHmac)) {
    console.error('[execute] HMAC validation failed for run:', runId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Load campaign_run
  const { data: run, error: runError } = await supabase
    .from('campaign_runs')
    .select('id, status, campaign_id, organization_id, items_total')
    .eq('id', runId)
    .single()

  if (runError || !run) {
    console.error('[execute] run not found:', runId, runError?.message)
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  // Idempotency guard — only process pending runs
  if (run.status !== 'pending') {
    return NextResponse.json({ ok: true, skipped: true, reason: `run status is '${run.status}'` })
  }

  const orgId = run.organization_id as string
  const campaignId = run.campaign_id as string

  // Kill switch re-check (could have been activated between schedule + execute time)
  const killActive = await isKillSwitchActive(supabase, orgId)
  if (killActive) {
    await supabase
      .from('campaign_runs')
      .update({ status: 'killed', completed_at: new Date().toISOString() })
      .eq('id', runId)
    return NextResponse.json({ ok: true, killed: true })
  }

  // Mark run as executing
  const now = new Date().toISOString()
  await supabase
    .from('campaign_runs')
    .update({ status: 'executing', started_at: now })
    .eq('id', runId)

  // Load campaign name for alerts
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name')
    .eq('id', campaignId)
    .single()

  // Load org name for alerts
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()

  // Load pending run items with draft data
  const { data: items, error: itemsError } = await supabase
    .from('campaign_run_items')
    .select(`
      id,
      channel,
      recipient_ref,
      campaign_draft_id,
      campaign_drafts (
        body_text,
        body_html,
        subject
      )
    `)
    .eq('run_id', runId)
    .eq('status', 'pending')

  if (itemsError || !items) {
    console.error('[execute] Failed to load run items:', itemsError?.message)
    await supabase
      .from('campaign_runs')
      .update({ status: 'failed', completed_at: new Date().toISOString(), error_message: 'Failed to load run items' })
      .eq('id', runId)
    return NextResponse.json({ error: 'Failed to load run items' }, { status: 500 })
  }

  let itemsSent = 0
  let itemsFailed = 0
  const failureChannels: Set<string> = new Set()
  const firstError: string[] = []

  // Execute each item
  for (const item of items) {
    const channel = item.channel as ChannelId
    const adapter = getAdapter(channel)

    // Build draft payload from joined campaign_drafts row
    // Supabase joins return arrays — cast through unknown per CLAUDE.md pattern
    const draftRow = (item.campaign_drafts as unknown as { body_text: string | null; body_html: string | null; subject: string | null } | null)

    const payload: CampaignDraftPayload = {
      bodyText: draftRow?.body_text ?? '',
      bodyHtml: draftRow?.body_html ?? undefined,
      subject: draftRow?.subject ?? undefined,
      recipientRef: item.recipient_ref ?? undefined,
      organizationId: orgId,
    }

    try {
      const result = await adapter.send(payload)

      if (result.success) {
        await supabase
          .from('campaign_run_items')
          .update({
            status: 'sent',
            provider_message_id: result.providerMessageId ?? null,
            published_url: result.publishedUrl ?? null,
            sent_at: new Date().toISOString(),
          })
          .eq('id', item.id)
        itemsSent++
      } else {
        await supabase
          .from('campaign_run_items')
          .update({
            status: 'failed',
            error_code: result.errorCode ?? 'SEND_FAILED',
            error_message: result.error ?? 'Unknown error',
          })
          .eq('id', item.id)
        itemsFailed++
        failureChannels.add(channel)
        if (firstError.length === 0) firstError.push(result.error ?? 'Unknown error')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error'
      await supabase
        .from('campaign_run_items')
        .update({
          status: 'failed',
          error_code: 'EXCEPTION',
          error_message: msg,
        })
        .eq('id', item.id)
      itemsFailed++
      failureChannels.add(channel)
      if (firstError.length === 0) firstError.push(msg)
    }
  }

  // Update run totals + final status
  const finalStatus = itemsFailed > 0 && itemsSent === 0 ? 'failed' : 'completed'
  await supabase
    .from('campaign_runs')
    .update({
      status: finalStatus,
      items_sent: itemsSent,
      items_failed: itemsFailed,
      completed_at: new Date().toISOString(),
      error_message: firstError[0] ?? null,
    })
    .eq('id', runId)

  // Update campaign status
  await supabase
    .from('campaigns')
    .update({ status: finalStatus === 'failed' ? 'failed' : 'completed' })
    .eq('id', campaignId)

  // Send failure alert if any items failed
  if (itemsFailed > 0) {
    await sendCampaignFailureAlert({
      orgName: org?.name ?? orgId,
      orgId,
      campaignName: campaign?.name ?? campaignId,
      runId,
      channel: Array.from(failureChannels).join(', '),
      errorMessage: firstError[0] ?? 'Unknown error',
      failedCount: itemsFailed,
      totalCount: items.length,
    }).catch((err) => console.error('[execute] Telegram alert failed:', err))
  }

  // Schedule verify job (5 min from now) — non-fatal if it fails
  await scheduleVerifyJob(runId).catch((err) =>
    console.error('[execute] scheduleVerifyJob failed:', err)
  )

  return NextResponse.json({ ok: true, items_sent: itemsSent, items_failed: itemsFailed })
}
