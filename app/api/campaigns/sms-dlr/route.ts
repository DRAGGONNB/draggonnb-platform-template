// Phase 11: POST /api/campaigns/sms-dlr — BulkSMS delivery receipt webhook (CAMP-03).
// BulkSMS retries on non-200 responses, so return 200 even for benign errors.
// Webhook URL must be configured in BulkSMS console (operator setup item).

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// BulkSMS DLR payload shape (simplified — full spec at BulkSMS docs)
interface BulkSmsDlr {
  id?: string
  status?: {
    type?: 'DELIVERED' | 'FAILED' | 'SENT' | 'UNKNOWN'
  }
}

function mapDlrStatus(type: string | undefined): 'verified' | 'failed' | null {
  if (type === 'DELIVERED') return 'verified'
  if (type === 'FAILED') return 'failed'
  // SENT / UNKNOWN: intermediate — do not update yet
  return null
}

export async function POST(request: Request) {
  let payload: BulkSmsDlr
  try {
    payload = (await request.json()) as BulkSmsDlr
  } catch {
    // BulkSMS must receive 200 to stop retrying — return 200 even on parse error
    console.error('[sms-dlr] Failed to parse body')
    return NextResponse.json({ ok: false, reason: 'parse_error' }, { status: 200 })
  }

  const messageId = payload.id
  const statusType = payload.status?.type

  if (!messageId) {
    return NextResponse.json({ ok: false, reason: 'missing_id' }, { status: 200 })
  }

  const newStatus = mapDlrStatus(statusType)
  if (!newStatus) {
    // Intermediate status — acknowledge but don't update
    return NextResponse.json({ ok: true, reason: 'intermediate_status' }, { status: 200 })
  }

  const supabase = createAdminClient()

  // Find campaign_run_item by provider_message_id
  const { data: item, error } = await supabase
    .from('campaign_run_items')
    .select('id, run_id')
    .eq('provider_message_id', messageId)
    .eq('channel', 'sms')
    .maybeSingle()

  if (error || !item) {
    console.warn('[sms-dlr] No item found for provider_message_id:', messageId)
    return NextResponse.json({ ok: true, reason: 'not_found' }, { status: 200 })
  }

  const updatePayload =
    newStatus === 'verified'
      ? { status: 'verified' as const, verified_at: new Date().toISOString() }
      : { status: 'failed' as const, error_message: 'BulkSMS DLR: FAILED' }

  await supabase.from('campaign_run_items').update(updatePayload).eq('id', item.id)

  return NextResponse.json({ ok: true }, { status: 200 })
}
