// Phase 11: Campaign Studio channel adapter types (CAMP-01)

export type ChannelId = 'email' | 'sms' | 'facebook' | 'instagram' | 'linkedin'

export interface SendResult {
  success: boolean
  providerMessageId?: string
  publishedUrl?: string   // social channels only
  error?: string
  errorCode?: string
}

export interface VerifyResult {
  found: boolean
  publishedUrl?: string
  error?: string
}

export interface CampaignDraftPayload {
  bodyText: string
  bodyHtml?: string
  subject?: string
  mediaUrls?: string[]
  recipientRef?: string  // email address, phone number, page_id
  organizationId: string
}

export interface ChannelAdapter {
  readonly channelId: ChannelId
  enabled(): boolean
  send(draft: CampaignDraftPayload): Promise<SendResult>
  verify(providerMessageId: string, orgId?: string): Promise<VerifyResult>
}
