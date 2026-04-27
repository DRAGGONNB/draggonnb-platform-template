// Phase 11. Credential-gated scaffold (CAMP-01 Option B). Real adapter logic ships when Meta/LinkedIn credentials land — no migration or interface change required at unblock-time.

import type { ChannelAdapter, ChannelId, CampaignDraftPayload, SendResult, VerifyResult } from './types'

export class LinkedInAdapter implements ChannelAdapter {
  readonly channelId: ChannelId = 'linkedin'

  enabled(): boolean {
    return !!process.env.LINKEDIN_CLIENT_ID
  }

  async send(draft: CampaignDraftPayload): Promise<SendResult> {
    if (!this.enabled()) {
      return {
        success: false,
        error: 'LinkedIn not connected. Set LINKEDIN_CLIENT_ID to enable.',
        errorCode: 'CHANNEL_DISABLED',
      }
    }
    // Real implementation: query social_accounts WHERE organization_id = draft.organizationId AND platform='linkedin'
    // to get page_id + page_access_token, POST via LinkedIn Marketing API.
    // Note: social_accounts table has page_id + page_access_token columns ready (RESEARCH B section 13).
    // DO NOT JOIN through created_by (legacy users FK).
    throw new Error('LinkedInAdapter.send: implementation pending LinkedIn App approval (CAMP-01 Option B scaffold)')
  }

  async verify(providerMessageId: string, orgId?: string): Promise<VerifyResult> {
    if (!this.enabled()) {
      return { found: false, error: 'LinkedIn not connected' }
    }
    throw new Error('LinkedInAdapter.verify: implementation pending LinkedIn App approval')
  }
}
