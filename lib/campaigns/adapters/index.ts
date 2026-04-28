// Phase 11: Campaign Studio adapter factory (CAMP-01).

import { EmailAdapter } from './email'
import { SmsAdapter } from './sms'
import { FacebookAdapter } from './facebook'
import { InstagramAdapter } from './instagram'
import { LinkedInAdapter } from './linkedin'
import type { ChannelAdapter, ChannelId } from './types'

const ADAPTERS: Record<ChannelId, ChannelAdapter> = {
  email: new EmailAdapter(),
  sms: new SmsAdapter(),
  facebook: new FacebookAdapter(),
  instagram: new InstagramAdapter(),
  linkedin: new LinkedInAdapter(),
}

export function getAdapter(channelId: ChannelId): ChannelAdapter {
  return ADAPTERS[channelId]
}

export function getEnabledChannels(): ChannelId[] {
  return (Object.keys(ADAPTERS) as ChannelId[]).filter(id => ADAPTERS[id].enabled())
}

export type { ChannelAdapter, ChannelId, SendResult, VerifyResult, CampaignDraftPayload } from './types'
