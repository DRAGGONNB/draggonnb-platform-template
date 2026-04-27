// Phase 11: Campaign Studio Email adapter wrapping Resend (CAMP-01).

import type { ChannelAdapter, ChannelId, CampaignDraftPayload, SendResult, VerifyResult } from './types'
import { sendEmail } from '@/lib/email/resend'

export class EmailAdapter implements ChannelAdapter {
  readonly channelId: ChannelId = 'email'

  enabled(): boolean {
    return !!process.env.RESEND_API_KEY
  }

  async send(draft: CampaignDraftPayload): Promise<SendResult> {
    if (!draft.recipientRef) {
      return { success: false, error: 'recipientRef (email address) is required for email channel', errorCode: 'MISSING_RECIPIENT' }
    }

    const result = await sendEmail({
      to: draft.recipientRef,
      subject: draft.subject ?? '(No subject)',
      html: draft.bodyHtml ?? `<p>${draft.bodyText}</p>`,
      text: draft.bodyText,
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error ?? 'Unknown email send error',
        errorCode: 'SEND_FAILED',
      }
    }

    return {
      success: true,
      providerMessageId: result.messageId,
    }
  }

  async verify(providerMessageId: string, orgId?: string): Promise<VerifyResult> {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { found: false, error: 'RESEND_API_KEY not configured' }
    }

    const response = await fetch(`https://api.resend.com/emails/${providerMessageId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!response.ok) {
      return { found: false, error: `Resend API ${response.status}` }
    }

    const data = (await response.json()) as { last_event?: string }
    const verifiedEvents = new Set(['delivered', 'opened', 'clicked'])
    const found = verifiedEvents.has(data.last_event ?? '')

    return { found }
  }
}
