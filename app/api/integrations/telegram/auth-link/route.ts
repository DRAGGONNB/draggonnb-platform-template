/**
 * app/api/integrations/telegram/auth-link/route.ts
 * POST /api/integrations/telegram/auth-link
 * Generates a one-time HMAC-signed Telegram deep-link for telegram_user_id activation.
 * Token format: {user_id}.{exp_unix}.{sig}
 * Token TTL: 15 minutes
 * Bot validates via /auth command handler in lib/telegram/handlers/auth-command.ts
 */

import { NextRequest } from 'next/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { createHmac } from 'crypto'

export async function POST(_req: NextRequest): Promise<Response> {
  const { data: userOrg, error } = await getUserOrg()
  if (error || !userOrg) {
    return Response.json({ error: 'auth required' }, { status: 401 })
  }

  const secret = process.env.TELEGRAM_AUTH_TOKEN_SECRET ?? process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret) {
    return Response.json({ error: 'server misconfigured — TELEGRAM_AUTH_TOKEN_SECRET not set' }, { status: 500 })
  }

  const exp = Math.floor(Date.now() / 1000) + 15 * 60  // 15 minutes
  const sig = createHmac('sha256', secret)
    .update(`${userOrg.userId}.${exp}`)
    .digest('hex')
  const token = `${userOrg.userId}.${exp}.${sig}`

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'DraggonnB_AssistantBot'
  const link = `https://t.me/${botUsername}?start=auth_${token}`

  return Response.json({ link })
}
