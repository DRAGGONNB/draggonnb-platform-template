/**
 * lib/approvals/notify.ts
 * Dispatches notify_on_complete callbacks when an approval reaches terminal status.
 *
 * W1: reads notify_on_complete from its OWN column on approval_requests
 * (NOT nested in action_payload) per CONTEXT C3. Prevents silent skip when
 * action_payload is null.
 *
 * Channels: telegram_chat_id | webhook_url | email (email deferred)
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegramMessage } from '@/lib/telegram/bot'

export async function dispatchNotifyOnComplete(
  approvalId: string,
  terminalStatus: string,
  detail: string
): Promise<void> {
  const supabase = createAdminClient()

  // W1: read from dedicated column, not action_payload
  const { data: ar } = await supabase
    .from('approval_requests')
    .select('notify_on_complete, product, action_type, target_resource_id')
    .eq('id', approvalId)
    .single()

  const cfg = ar?.notify_on_complete as {
    telegram_chat_id?: string
    webhook_url?: string
    email?: string
  } | null

  if (!cfg) return

  const message = `Approval ${terminalStatus}: ${ar?.product}.${ar?.action_type} — ${detail}`

  if (cfg.telegram_chat_id) {
    try {
      await sendTelegramMessage(cfg.telegram_chat_id, message)
    } catch (e) {
      console.error('[notify] Telegram channel notify failed:', e)
    }
  }

  if (cfg.webhook_url) {
    await fetch(cfg.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approval_id: approvalId,
        status: terminalStatus,
        detail,
        product: ar?.product,
        action_type: ar?.action_type,
        resource_id: ar?.target_resource_id,
      }),
    }).catch((e) => console.error('[notify] Webhook notify failed:', e))
  }

  // Email channel deferred — use existing lib/email/* helpers when cfg.email is present
  if (cfg.email) {
    console.log(`[notify] Email notify deferred for approval ${approvalId} → ${cfg.email}`)
  }
}
