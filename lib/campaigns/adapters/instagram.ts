// Phase 11. Credential-gated scaffold (CAMP-01 Option B). Real adapter logic ships when Meta/LinkedIn credentials land — no migration or interface change required at unblock-time.

import type { ChannelAdapter, ChannelId, CampaignDraftPayload, SendResult, VerifyResult } from './types'

export class InstagramAdapter implements ChannelAdapter {
  readonly channelId: ChannelId = 'instagram'

  enabled(): boolean {
    // Instagram Basic Display + Graph API share Meta credentials
    return !!process.env.META_APP_ID
  }

  async send(draft: CampaignDraftPayload): Promise<SendResult> {
    if (!this.enabled()) {
      return {
        success: false,
        error: 'Instagram not connected. Set META_APP_ID to enable.',
        errorCode: 'CHANNEL_DISABLED',
      }
    }
    // Real implementation: query social_accounts WHERE organization_id = draft.organizationId AND platform='instagram'
    // to get page_id + page_access_token, POST via Instagram Graph API.
    // Note: social_accounts table has page_id + page_access_token columns ready (RESEARCH B section 13).
    // DO NOT JOIN through created_by (legacy users FK).
    throw new Error('InstagramAdapter.send: implementation pending Meta App approval (CAMP-01 Option B scaffold)')
  }

  async verify(providerMessageId: string, orgId?: string): Promise<VerifyResult> {
    if (!this.enabled()) {
      return { found: false, error: 'Instagram not connected' }
    }
    throw new Error('InstagramAdapter.verify: implementation pending Meta App approval')
  }
}
