'use client'

import { useState } from 'react'
import { ApprovalList } from './ApprovalList'
import type { ApprovalDraft } from './ApprovalList'
import { PublishConfirmModal } from './PublishConfirmModal'
import type { ChannelAccount } from './PublishConfirmModal'

interface ApprovalScreenProps {
  campaignId: string
  drafts: ApprovalDraft[]
  channelAccounts: ChannelAccount[]
}

export function ApprovalScreen({ campaignId, drafts, channelAccounts }: ApprovalScreenProps) {
  const [publishModalOpen, setPublishModalOpen] = useState(false)

  return (
    <>
      <ApprovalList
        drafts={drafts}
        onApproveAll={() => {/* state managed inside ApprovalList */}}
        onOpenPublishModal={() => setPublishModalOpen(true)}
      />

      <PublishConfirmModal
        open={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        campaignId={campaignId}
        channelAccounts={channelAccounts}
        drafts={drafts.map((d) => ({
          id: d.id,
          channel: d.channel,
          body_text: d.body_text,
          subject: d.subject,
        }))}
      />
    </>
  )
}
