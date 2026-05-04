/**
 * lib/telegram/handlers/approval-callback.ts
 * grammY callback_query handlers for approval spine.
 * Implements RESEARCH.md Pattern 1 (two-pass edit) + Pattern 2 (verifyApprover) + Pattern 5 (atomic proc).
 *
 * Callback data format (Phase 14 smoke fix — 64-byte cap):
 *   approve:{product}:{approval_id}
 *   reject:{product}:{approval_id}
 *   reason:{code}:{approval_id}
 *   reason:other:{approval_id}
 *
 * action_type was dropped from callback_data because the original 4-segment
 * shape exceeded Telegram's 64-byte callback_data limit for `damage_charge`.
 * Handlers now look up action_type from approval_requests by resource_id.
 */

import { Bot, InlineKeyboard, Context } from 'grammy'
import type { ConversationFlavor } from '@grammyjs/conversations'

type BotContext = Context & ConversationFlavor<Context>
import { parseCallbackData } from '@/lib/telegram/callback-registry'
import { verifyApprover } from '@/lib/approvals/spine'
import { createAdminClient } from '@/lib/supabase/admin'

export function registerApprovalCallbacks(bot: Bot<BotContext>): void {
  // approve:{product}:{approval_id} — action_type lookup happens via DB by approval_id
  bot.callbackQuery(/^approve:(draggonnb|trophy):[0-9a-f-]+$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    const parsed = parseCallbackData(ctx.callbackQuery.data!)
    if (!parsed) return

    const supabase = createAdminClient()

    // Lookup approval to get target_org_id + product BEFORE verifying approver
    const { data: approval } = await supabase
      .from('approval_requests')
      .select('id, target_org_id, product')
      .eq('id', parsed.resource_id)
      .single()

    if (!approval) {
      await ctx.answerCallbackQuery({ text: 'Approval not found', show_alert: true })
      return
    }

    // Forwarded-message safety: verify approver via telegram_user_id + org. NEVER trust ctx.from.id alone.
    const telegramUserId = ctx.from.id
    const approver = await verifyApprover(telegramUserId, approval.target_org_id, approval.product as any)

    if (!approver.isAuthorized) {
      await ctx.answerCallbackQuery({ text: 'approver not authorized', show_alert: true })
      return
    }

    // B3: Store message refs FIRST so worker can do pass-2 edit even if RPC times out
    await supabase
      .from('approval_requests')
      .update({
        telegram_message_id: ctx.callbackQuery.message?.message_id ?? null,
        telegram_chat_id: ctx.callbackQuery.message?.chat.id ?? null,
      })
      .eq('id', parsed.resource_id)

    // Pass 1: strip keyboard + Processing edit (with HH:MM timestamp per CONTEXT A3)
    const hhmm = new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() })
      const original = ctx.callbackQuery.message?.text ?? ''
      await ctx.editMessageText(original + `\n\n[${hhmm}] Approved — Processing...`)
    } catch (e: any) {
      if (!String(e?.description ?? e?.message ?? '').includes('message is not modified')) throw e
      // Already actioned by another approver — message refs already stored above; safe to return
      return
    }

    // Atomic flip + enqueue
    const { data: rpcResult } = await supabase.rpc('approve_request_atomic', {
      p_approval_id: parsed.resource_id,
      p_approver_user_id: approver.userId,
      p_decision: 'approved',
    })

    // If already actioned (race), inform the approver
    if ((rpcResult as any)?.result === 'already_actioned') {
      try {
        await ctx.editMessageText(`[${hhmm}] Already processed by another approver`, { reply_markup: { inline_keyboard: [] } })
      } catch { /* ignore */ }
    }
  })

  // reject:{product}:{approval_id} — action_type lookup happens via DB by approval_id
  bot.callbackQuery(/^reject:(draggonnb|trophy):[0-9a-f-]+$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    const parsed = parseCallbackData(ctx.callbackQuery.data!)
    if (!parsed) return

    // Verify approver before showing reason picker
    const supabase = createAdminClient()
    const { data: approval } = await supabase
      .from('approval_requests')
      .select('target_org_id, product')
      .eq('id', parsed.resource_id)
      .single()
    if (!approval) return

    const approver = await verifyApprover(ctx.from.id, approval.target_org_id, approval.product as any)
    if (!approver.isAuthorized) {
      await ctx.answerCallbackQuery({ text: 'approver not authorized', show_alert: true })
      return
    }

    const kb = new InlineKeyboard()
      .text('Wrong amount', `reason:wrong_amount:${parsed.resource_id}`)
      .text('Not chargeable', `reason:not_chargeable:${parsed.resource_id}`)
      .row()
      .text('Need more info', `reason:need_more_info:${parsed.resource_id}`)
      .text('Other', `reason:other:${parsed.resource_id}`)

    await ctx.reply('Select rejection reason:', { reply_markup: kb })
  })

  // reason:{code}:{approval_id} (preset reasons)
  bot.callbackQuery(/^reason:(wrong_amount|not_chargeable|need_more_info):[0-9a-f-]+$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    const parts = ctx.callbackQuery.data!.split(':')
    const code = parts[1]
    const approvalId = parts[2]
    const supabase = createAdminClient()

    const { data: approval } = await supabase
      .from('approval_requests')
      .select('target_org_id, product')
      .eq('id', approvalId)
      .single()
    if (!approval) return

    const approver = await verifyApprover(ctx.from.id, approval.target_org_id, approval.product as any)
    if (!approver.isAuthorized) {
      await ctx.answerCallbackQuery({ text: 'approver not authorized', show_alert: true })
      return
    }

    await supabase.rpc('approve_request_atomic', {
      p_approval_id: approvalId,
      p_approver_user_id: approver.userId,
      p_decision: 'rejected',
      p_rejection_reason_code: code,
      p_rejection_reason_text: null,
    })

    await ctx.editMessageText(`Rejected — ${code.replace(/_/g, ' ')}`, { reply_markup: { inline_keyboard: [] } })
  })

  // reason:other:{approval_id} — triggers conversation flow
  // W6: v2 conversations API — pass approvalId as positional arg at enter() time, NOT via session
  bot.callbackQuery(/^reason:other:[0-9a-f-]+$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    const approvalId = ctx.callbackQuery.data!.split(':')[2]
    await (ctx as any).conversation.enter('rejectOtherReason', approvalId)
  })
}
