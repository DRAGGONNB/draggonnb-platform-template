/**
 * lib/telegram/bot.ts
 * grammY Bot singleton for the main DraggonnB approval/notification bot.
 * STACK-05: replaces raw api.telegram.org fetch calls.
 *
 * Usage:
 *   import { getBot, sendTelegramMessage, editTelegramMessage } from '@/lib/telegram/bot'
 *
 * Handlers registered at construction:
 *   - registerAuthCommand: /start auth_<token> + /auth <token>
 *   - registerApprovalCallbacks: approve/reject/reason callback_query handlers
 *   - registerRejectConversation: @grammyjs/conversations flow for "Other" rejection reason
 */

import { Bot, Context } from 'grammy'
import { conversations, type ConversationFlavor } from '@grammyjs/conversations'

// Bot context type with conversation support
type BotContext = Context & ConversationFlavor<Context>

let _bot: Bot<BotContext> | null = null

export function getBot(): Bot<BotContext> {
  if (_bot) return _bot
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN not set')
  _bot = new Bot<BotContext>(process.env.TELEGRAM_BOT_TOKEN)
  _bot.use(conversations())

  // Lazy-load handlers to avoid circular dependency at module init time
  // Handlers are registered dynamically after bot creation
  const { registerAuthCommand } = require('./handlers/auth-command')
  const { registerApprovalCallbacks } = require('./handlers/approval-callback')
  const { registerRejectConversation } = require('./handlers/reject-conversation')

  registerAuthCommand(_bot)
  registerRejectConversation(_bot)  // must register conversation BEFORE handlers that enter it
  registerApprovalCallbacks(_bot)

  return _bot
}

/**
 * Sends a message via the main DraggonnB bot.
 * Preserves the legacy public API surface so callers outside this file don't break.
 */
export async function sendTelegramMessage(
  chat_id: number | string,
  text: string,
  opts?: Record<string, unknown>
): Promise<unknown> {
  const bot = getBot()
  return bot.api.sendMessage(chat_id as any, text, opts as any)
}

/**
 * Edits an existing message text.
 * Silently swallows "message is not modified" errors (idempotent edit).
 */
export async function editTelegramMessage(
  chat_id: number | string,
  message_id: number,
  text: string,
  opts?: Record<string, unknown>
): Promise<unknown> {
  const bot = getBot()
  try {
    return await bot.api.editMessageText(chat_id as any, message_id, text, opts as any)
  } catch (e: any) {
    if (String(e?.description ?? e?.message ?? '').includes('message is not modified')) return null
    throw e
  }
}

/**
 * Legacy compat: sendLeadNotification wrapper — preserved for existing callsites in lib/agents/*.
 * Uses the new sendTelegramMessage internally.
 */
export async function sendLeadNotification(
  leadId: string,
  leadData: {
    business_name: string
    phone: string
    email: string
    website: string
    industry: string
    issues: string[]
  },
  qualResult: Record<string, unknown>
): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!chatId) {
    console.error('TELEGRAM_CHAT_ID not set — skipping lead notification')
    return
  }

  const score = qualResult?.score as Record<string, number> | undefined
  const status = qualResult?.qualification_status as string || 'unknown'
  const tier = qualResult?.recommended_tier as string || 'unknown'
  const reasoning = qualResult?.reasoning as string || 'No reasoning available'

  const text = [
    '*New Lead from WhatsApp*',
    '',
    `*Business:* ${escapeMarkdown(leadData.business_name)}`,
    `*Phone:* ${escapeMarkdown(leadData.phone)}`,
    `*Email:* ${escapeMarkdown(leadData.email)}`,
    `*Website:* ${escapeMarkdown(leadData.website || 'N/A')}`,
    `*Industry:* ${escapeMarkdown(leadData.industry)}`,
    '',
    `*Issues:*`,
    ...leadData.issues.map((i) => `  - ${escapeMarkdown(i)}`),
    '',
    '*Qualification Result*',
    `*Status:* ${status === 'qualified' ? 'Qualified' : 'Not Qualified'}`,
    `*Fit:* ${score?.fit || 0}/10  *Urgency:* ${score?.urgency || 0}/10  *Size:* ${score?.size || 0}/10`,
    `*Overall:* ${score?.overall || 0}/10`,
    `*Recommended Tier:* ${tier}`,
    '',
    `*Reasoning:* ${escapeMarkdown(reasoning.slice(0, 300))}`,
  ].join('\n')

  try {
    await sendTelegramMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: 'Approve & Provision', callback_data: `approve:${leadId}` },
          { text: 'Reject', callback_data: `reject:${leadId}` },
        ]],
      },
    })
  } catch (e) {
    console.error('Telegram send error:', e)
  }
}

/**
 * Legacy compat: sendMessage wrapper.
 */
export async function sendMessage(text: string): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!chatId) {
    console.error('TELEGRAM_CHAT_ID not set — skipping message')
    return
  }
  try {
    await sendTelegramMessage(chatId, text, { parse_mode: 'Markdown' })
  } catch (e) {
    console.error('Telegram send error:', e)
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1')
}
