/**
 * lib/telegram/handlers/auth-command.ts
 * Telegram /auth deep-link activation flow.
 * Validates HMAC-signed one-time token, upserts user_profiles.telegram_user_id.
 */

import type { Bot, Context } from 'grammy'
import type { ConversationFlavor } from '@grammyjs/conversations'

type BotContext = Context & ConversationFlavor<Context>
import { createAdminClient } from '@/lib/supabase/admin'
import { createHmac, timingSafeEqual } from 'crypto'

export function registerAuthCommand(bot: Bot<BotContext>): void {
  // /start auth_<token> (deep-link from web settings page)
  bot.command('start', async (ctx) => {
    const arg = ctx.match  // text after /start
    if (!arg?.startsWith('auth_')) {
      await ctx.reply('Welcome to DraggonnB. Use /auth <token> from your dashboard to link this Telegram account.')
      return
    }
    await handleAuthToken(ctx, arg.slice('auth_'.length))
  })

  bot.command('auth', async (ctx) => {
    const token = ctx.match?.trim()
    if (!token) {
      await ctx.reply('Usage: /auth <token> — generate a token from /dashboard/settings/integrations/telegram')
      return
    }
    await handleAuthToken(ctx, token)
  })
}

async function handleAuthToken(ctx: any, token: string): Promise<void> {
  const secret = process.env.TELEGRAM_AUTH_TOKEN_SECRET ?? process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret) { await ctx.reply('Server misconfigured'); return }

  // Token format: <user_id>.<exp_unix>.<sig>
  const [userId, expStr, sig] = token.split('.')
  if (!userId || !expStr || !sig) { await ctx.reply('Invalid token'); return }
  const exp = parseInt(expStr, 10)
  if (isNaN(exp) || Date.now() / 1000 > exp) {
    await ctx.reply('Token expired — generate a new one in /dashboard/settings/integrations/telegram')
    return
  }

  const expected = createHmac('sha256', secret).update(`${userId}.${expStr}`).digest('hex')
  let sigBuf: Buffer, expBuf: Buffer
  try {
    sigBuf = Buffer.from(sig, 'hex')
    expBuf = Buffer.from(expected, 'hex')
  } catch {
    await ctx.reply('Invalid token format')
    return
  }

  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    await ctx.reply('Invalid signature')
    return
  }

  const supabase = createAdminClient()
  // BUGFIX (Phase 14 smoke): user_profiles PK is `id` (mirrors auth.users.id), NOT `user_id`.
  // Original Phase 14-03 code 400'd the upsert and broke the /auth deep-link flow.
  const { error } = await supabase.from('user_profiles').upsert({
    id: userId,
    telegram_user_id: ctx.from.id,
  }, { onConflict: 'id' })

  if (error) {
    await ctx.reply(`Failed to link: ${error.message}`)
    return
  }
  await ctx.reply('Telegram linked successfully. You will now receive approval requests here.')
}
