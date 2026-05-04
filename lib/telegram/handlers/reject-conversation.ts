/**
 * lib/telegram/handlers/reject-conversation.ts
 * @grammyjs/conversations v2 flow for "Other" rejection reason free-text capture.
 * W6: v2 signature — approvalId passed as positional arg at conversation.enter() time, NOT via ctx.session.
 */

import type { Bot, Context } from 'grammy'
import { createConversation, type Conversation, type ConversationFlavor } from '@grammyjs/conversations'

type BotContext = Context & ConversationFlavor<Context>
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyApprover, verifyProductPermission } from '@/lib/approvals/spine'

// W6: v2 signature — args passed via positional params at enter() time
async function rejectOtherReason(
  conversation: Conversation<any>,
  ctx: any,
  approvalId: string,
): Promise<void> {
  await ctx.reply('Reply with the rejection reason (free text):')
  const reply = await conversation.wait()
  const reasonText = (reply.message as any)?.text?.trim()
  if (!reasonText) {
    await ctx.reply('No reason provided — cancelled')
    return
  }

  const supabase = createAdminClient()
  const { data: approval } = await supabase
    .from('approval_requests')
    .select('target_org_id, product')
    .eq('id', approvalId)
    .single()
  if (!approval) {
    await ctx.reply('Approval not found')
    return
  }

  const approver = await verifyApprover(ctx.from.id, approval.target_org_id, approval.product as any)
  if (!approver.isAuthorized) {
    await ctx.reply('approver not authorized')
    return
  }

  // W4: D2 product-scoped enforcement — double-check via verifyProductPermission
  const productOk = await verifyProductPermission(approver.userId, approval.target_org_id, approval.product as any)
  if (!productOk) {
    await ctx.reply('no permission for this product')
    return
  }

  await supabase.rpc('approve_request_atomic', {
    p_approval_id: approvalId,
    p_approver_user_id: approver.userId,
    p_decision: 'rejected',
    p_rejection_reason_code: 'other',
    p_rejection_reason_text: reasonText,
  })
  await ctx.reply(`Rejected — ${reasonText.slice(0, 80)}`)
}

export function registerRejectConversation(bot: Bot<BotContext>): void {
  bot.use(createConversation(rejectOtherReason as any, 'rejectOtherReason'))
}
