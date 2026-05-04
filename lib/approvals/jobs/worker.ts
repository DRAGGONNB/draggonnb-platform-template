/**
 * lib/approvals/jobs/worker.ts
 * Dequeues approval_jobs via SKIP LOCKED RPC, invokes handler, updates status,
 * fires two-pass Telegram message edit + notify_on_complete.
 *
 * Called by:
 *   - app/api/cron/approval-worker/route.ts (Vercel cron or pg_net POST)
 *   - pg-cron Job 2 (migration 25, only if pg_net present)
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { HANDLER_REGISTRY } from '@/lib/approvals/handler-registry'
import { dispatchNotifyOnComplete } from '@/lib/approvals/notify'
import { editTelegramMessage } from '@/lib/telegram/bot'

export async function processApprovalJobs(maxJobs = 5): Promise<{ processed: number }> {
  const supabase = createAdminClient()

  // Claim queued jobs with SKIP LOCKED via stored proc (migration 27)
  const { data: jobs, error } = await supabase.rpc('claim_approval_jobs', { p_limit: maxJobs })
  if (error) throw error

  let processed = 0

  for (const job of (jobs as any[]) ?? []) {
    if (job.handler_path === '__expiry_notify__') {
      await handleExpiryNotify(job)
      processed++
      continue
    }

    const registryEntry = HANDLER_REGISTRY[job.handler_path]
    if (!registryEntry?.handler?.execute) {
      await supabase
        .from('approval_jobs')
        .update({ status: 'failed', error_text: 'no handler registered', completed_at: new Date().toISOString() })
        .eq('id', job.id)
      await supabase
        .from('approval_requests')
        .update({ status: 'failed' })
        .eq('id', job.approval_request_id)
      await sendPass2Edit(job.approval_request_id, 'failed', 'no handler registered')
      continue
    }

    try {
      const result = await registryEntry.handler.execute(job.payload)
      const terminalStatus = result.status === 'executed' ? 'executed' : 'failed'

      await supabase
        .from('approval_jobs')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', job.id)
      await supabase
        .from('approval_requests')
        .update({ status: terminalStatus })
        .eq('id', job.approval_request_id)

      await sendPass2Edit(job.approval_request_id, terminalStatus, result.detail)
      await dispatchNotifyOnComplete(job.approval_request_id, terminalStatus, result.detail)
    } catch (e: any) {
      const errText = String(e?.message ?? e)
      await supabase
        .from('approval_jobs')
        .update({ status: 'failed', error_text: errText, completed_at: new Date().toISOString() })
        .eq('id', job.id)
      await supabase
        .from('approval_requests')
        .update({ status: 'failed' })
        .eq('id', job.approval_request_id)
      await sendPass2Edit(job.approval_request_id, 'failed', errText)
      await dispatchNotifyOnComplete(job.approval_request_id, 'failed', errText)
    }
    processed++
  }

  return { processed }
}

async function handleExpiryNotify(job: any): Promise<void> {
  // Pass-2 edit: Expired
  await sendPass2Edit(job.approval_request_id, 'expired', 'expiry_hours elapsed')
  await dispatchNotifyOnComplete(job.approval_request_id, 'expired', 'expiry_hours elapsed')
  const supabase = createAdminClient()
  await supabase
    .from('approval_jobs')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', job.id)
}

async function sendPass2Edit(
  approvalId: string,
  terminalStatus: string,
  detail: string
): Promise<void> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('approval_requests')
    .select('telegram_message_id, telegram_chat_id')
    .eq('id', approvalId)
    .single()

  if (!data?.telegram_message_id || !data?.telegram_chat_id) return

  const icon =
    terminalStatus === 'executed'
      ? '[DONE]'
      : terminalStatus === 'failed'
        ? '[WARN]'
        : terminalStatus === 'expired'
          ? '[EXPIRED]'
          : '[X]'

  const text = `${icon} ${terminalStatus} — ${detail}`

  try {
    await editTelegramMessage(data.telegram_chat_id, data.telegram_message_id as number, text)
  } catch (e) {
    console.error('[worker] Pass-2 edit failed:', e)
  }
}
