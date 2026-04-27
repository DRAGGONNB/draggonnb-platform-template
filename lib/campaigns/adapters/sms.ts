// Phase 11: Campaign Studio SMS adapter using BulkSMS (SA-headquartered, ZAR billing, CAMP-01).
// BulkSMS chosen over SMS Portal/Clickatell/Twilio per RESEARCH B section 1: direct SA SMSC routing, lowest per-message cost.

import type { ChannelAdapter, ChannelId, CampaignDraftPayload, SendResult, VerifyResult } from './types'

interface BulkSmsMessage {
  id: string
  status?: {
    type: string
  }
}

function buildBasicAuth(): string {
  const tokenId = process.env.BULKSMS_TOKEN_ID ?? ''
  const tokenSecret = process.env.BULKSMS_TOKEN_SECRET ?? ''
  return Buffer.from(`${tokenId}:${tokenSecret}`).toString('base64')
}

/**
 * Normalise phone number to E.164 format.
 * If the number doesn't start with '+', prepend '+27' as SA fallback.
 * Callers should ideally pass E.164 input.
 */
function normalisePhone(phone: string): string {
  // Defensive normalization: input assumed E.164 with '+'; prepend '+27' as SA fallback if missing.
  if (phone.startsWith('+')) return phone
  return `+27${phone.replace(/^0/, '')}`
}

export class SmsAdapter implements ChannelAdapter {
  readonly channelId: ChannelId = 'sms'

  enabled(): boolean {
    return !!(process.env.BULKSMS_TOKEN_ID && process.env.BULKSMS_TOKEN_SECRET)
  }

  async send(draft: CampaignDraftPayload): Promise<SendResult> {
    if (!draft.recipientRef) {
      return { success: false, error: 'recipientRef (phone number) is required for SMS channel', errorCode: 'MISSING_RECIPIENT' }
    }

    const to = normalisePhone(draft.recipientRef)
    const from = process.env.BULKSMS_SENDER_ID ?? 'DraggonnB'
    const body = draft.bodyText

    const response = await fetch('https://api.bulksms.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${buildBasicAuth()}`,
      },
      body: JSON.stringify({ to, body, from }),
    })

    if (!response.ok) {
      return { success: false, error: `BulkSMS ${response.status}`, errorCode: 'SEND_FAILED' }
    }

    const data = (await response.json()) as BulkSmsMessage[]
    const message = data[0]

    return {
      success: true,
      providerMessageId: message?.id,
    }
  }

  async verify(providerMessageId: string, orgId?: string): Promise<VerifyResult> {
    if (!this.enabled()) {
      return { found: false, error: 'BulkSMS credentials not configured' }
    }

    const response = await fetch(`https://api.bulksms.com/v1/messages/${providerMessageId}`, {
      headers: { Authorization: `Basic ${buildBasicAuth()}` },
    })

    if (!response.ok) {
      return { found: false, error: `BulkSMS ${response.status}` }
    }

    const data = (await response.json()) as BulkSmsMessage
    const found = data.status?.type === 'DELIVERED'

    return { found }
  }
}
