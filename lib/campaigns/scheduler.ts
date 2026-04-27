// Phase 11: Campaign scheduler helpers — pg_cron + pg_net via SECURITY DEFINER RPC (CAMP-03).
// Migration 50 (`schedule_campaign_run_job`) must be applied before these functions work.

import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

/**
 * Build a one-time pg_cron expression (minute-level resolution).
 * Risk: up to 59s drift from the requested time — acceptable for v3.0 Campaign Studio.
 */
function buildCronExpr(date: Date): string {
  return `${date.getUTCMinutes()} ${date.getUTCHours()} ${date.getUTCDate()} ${date.getUTCMonth() + 1} *`
}

/**
 * Sign a run ID with HMAC-SHA256 using INTERNAL_HMAC_SECRET.
 * The execute / verify routes validate this header before processing.
 */
function signRunId(runId: string): string {
  const secret = process.env.INTERNAL_HMAC_SECRET
  if (!secret) throw new Error('INTERNAL_HMAC_SECRET env var is not set')
  return crypto.createHmac('sha256', secret).update(runId).digest('hex')
}

/**
 * Schedule a pg_cron job that fires pg_net POST to /api/campaigns/execute at `scheduledAt`.
 * Persists `cron_job_name` on the campaign_runs row for future unschedule via kill switch.
 */
export async function scheduleCampaignRun(runId: string, scheduledAt: Date): Promise<void> {
  const supabase = createAdminClient()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (!baseUrl) throw new Error('NEXT_PUBLIC_BASE_URL env var is not set')

  const hmac = signRunId(runId)
  const cronExpr = buildCronExpr(scheduledAt)
  const jobName = `campaign_run_${runId}`

  const { error } = await supabase.rpc('schedule_campaign_run_job', {
    p_job_name: jobName,
    p_cron_expr: cronExpr,
    p_url: `${baseUrl}/api/campaigns/execute`,
    p_hmac: hmac,
    p_run_id: runId,
  })
  if (error) throw new Error(`scheduleCampaignRun RPC failed: ${error.message}`)

  // Persist job name so kill switch can call cron.unschedule(cron_job_name) later
  const { error: updateError } = await supabase
    .from('campaign_runs')
    .update({ cron_job_name: jobName })
    .eq('id', runId)
  if (updateError) {
    console.error('[scheduler] Failed to persist cron_job_name:', updateError.message)
    // Non-fatal — kill switch will fall back to status-based cancellation
  }
}

/**
 * Schedule a one-time verify job 5 minutes from now via the same RPC pattern.
 * The verify job calls /api/campaigns/verify to populate published_url + verified_at.
 */
export async function scheduleVerifyJob(runId: string): Promise<void> {
  const supabase = createAdminClient()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (!baseUrl) throw new Error('NEXT_PUBLIC_BASE_URL env var is not set')

  const fiveMinFromNow = new Date(Date.now() + 5 * 60_000)
  const cronExpr = buildCronExpr(fiveMinFromNow)
  const hmac = signRunId(runId)
  const jobName = `verify_run_${runId}`

  const { error } = await supabase.rpc('schedule_campaign_run_job', {
    p_job_name: jobName,
    p_cron_expr: cronExpr,
    p_url: `${baseUrl}/api/campaigns/verify`,
    p_hmac: hmac,
    p_run_id: runId,
  })
  if (error) {
    // Non-fatal: log but do not throw — run is already executing; verify failure is recoverable
    console.error('[scheduler] scheduleVerifyJob RPC failed:', error.message)
  }
}

/**
 * Validate an inbound HMAC header from pg_net against the expected signature.
 * Used by execute and verify route handlers.
 * Returns true if valid, false if missing / incorrect.
 */
export function validateInternalHmac(runId: string, receivedHmac: string | null): boolean {
  if (!receivedHmac) return false
  try {
    const expected = signRunId(runId)
    // Constant-time comparison to prevent timing attacks
    const a = Buffer.from(expected, 'hex')
    const b = Buffer.from(receivedHmac, 'hex')
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}
