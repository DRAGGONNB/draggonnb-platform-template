/**
 * lib/approvals/handlers/draggonnb-content-post.ts
 * Real handler for draggonnb.social_post (content_post) action type.
 * Preserves existing v3.0 social-post behavior: reads post_id from payload,
 * UPDATEs social_posts.status = 'approved' to trigger N8N workflow hooks.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export interface ContentPostPayload {
  post_id: string
  organization_id?: string
}

export interface HandlerResult {
  status: 'executed' | 'failed'
  detail: string
}

export const contentPostHandler = {
  product: 'draggonnb' as const,
  action_type: 'social_post',  // matches legacy action_type for backward compat (APPROVAL-03 regression)
  expiry_hours: 48, // per CONTEXT D1

  async execute(payload: ContentPostPayload): Promise<HandlerResult> {
    const supabase = createAdminClient()

    // Preserve v3.0 behavior: UPDATE social_posts.status → triggers N8N hook as before
    const { error } = await supabase
      .from('social_posts')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', payload.post_id)

    if (error) {
      return { status: 'failed', detail: `Post approval failed: ${error.message}` }
    }

    return {
      status: 'executed',
      detail: `Social post ${payload.post_id} approved — N8N workflow triggers as before`,
    }
  },

  async revert(payload: { post_id: string; reason: string }): Promise<HandlerResult> {
    const supabase = createAdminClient()
    await supabase
      .from('social_posts')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', payload.post_id)
    return { status: 'executed', detail: `Post ${payload.post_id} reverted to rejected` }
  },
}
