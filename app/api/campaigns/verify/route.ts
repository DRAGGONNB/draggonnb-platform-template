// Phase 11: POST /api/campaigns/verify — HMAC-authenticated post-publish verify endpoint (CAMP-05).
// Called by pg_cron 5 minutes after execute completes. NOT called by users directly.
// Populates published_url + verified_at on each sent item, then marks run completed.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateInternalHmac } from '@/lib/campaigns/scheduler'
import { getAdapter } from '@/lib/campaigns/adapters'
import type { ChannelId } from '@/lib/campaigns/adapters'

export async function POST(request: Request) {
  // Parse body early for run_id
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

  // HMAC validation
  const receivedHmac = request.headers.get('x-internal-hmac')
  if (!validateInternalHmac(runId, receivedHmac)) {
    console.error('[verify] HMAC validation failed for run:', runId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Load run to get org context
  const { data: run, error: runError } = await supabase
    .from('campaign_runs')
    .select('id, campaign_id, organization_id, status')
    .eq('id', runId)
    .single()

  if (runError || !run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  const orgId = run.organization_id as string

  // Load sent items that haven't been verified yet
  const { data: items, error: itemsError } = await supabase
    .from('campaign_run_items')
    .select('id, channel, provider_message_id, status')
    .eq('run_id', runId)
    .eq('status', 'sent')

  if (itemsError) {
    console.error('[verify] Failed to load run items:', itemsError.message)
    return NextResponse.json({ error: 'Failed to load run items' }, { status: 500 })
  }

  if (!items || items.length === 0) {
    // Nothing to verify — idempotent
    return NextResponse.json({ ok: true, verified: 0, failed: 0, skipped: true })
  }

  let verified = 0
  let failed = 0

  for (const item of items) {
    if (!item.provider_message_id) {
      // Can't verify without a message ID — mark failed
      await supabase
        .from('campaign_run_items')
        .update({ status: 'failed', error_message: 'No provider_message_id to verify' })
        .eq('id', item.id)
      failed++
      continue
    }

    const channel = item.channel as ChannelId
    const adapter = getAdapter(channel)

    try {
      const result = await adapter.verify(item.provider_message_id as string, orgId)

      if (result.found) {
        await supabase
          .from('campaign_run_items')
          .update({
            status: 'verified',
            verified_at: new Date().toISOString(),
            ...(result.publishedUrl ? { published_url: result.publishedUrl } : {}),
          })
          .eq('id', item.id)
        verified++
      } else {
        await supabase
          .from('campaign_run_items')
          .update({
            status: 'failed',
            error_message: result.error ?? 'Verification: message not found at provider',
          })
          .eq('id', item.id)
        failed++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error during verify'
      await supabase
        .from('campaign_run_items')
        .update({ status: 'failed', error_message: msg })
        .eq('id', item.id)
      failed++
    }
  }

  // If all items in the run are now verified or failed, mark run as completed (idempotent)
  const { data: remaining } = await supabase
    .from('campaign_run_items')
    .select('id')
    .eq('run_id', runId)
    .in('status', ['pending', 'sent'])

  if (!remaining || remaining.length === 0) {
    await supabase
      .from('campaign_runs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', runId)
      .neq('status', 'failed') // Don't overwrite 'failed' status with 'completed'
  }

  return NextResponse.json({ ok: true, verified, failed })
}
