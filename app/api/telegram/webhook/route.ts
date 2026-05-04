/**
 * app/api/telegram/webhook/route.ts
 * grammY webhook endpoint for DraggonnB bot.
 * Node.js runtime (NOT Edge — grammY conversations require Node crypto + event emitters).
 *
 * Security:
 *   - secretToken validates X-Telegram-Bot-Api-Secret-Token header (TELEGRAM_WEBHOOK_SECRET)
 *   - telegram_update_log PK conflict drops replayed update_ids (APPROVAL-09)
 *   - onTimeout: 'return' — returns 200 quickly; Telegram retries are handled by replay protection
 */

import { webhookCallback } from 'grammy'
import { getBot } from '@/lib/telegram/bot'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
// DO NOT add: export const runtime = 'edge'  (grammY requires Node.js runtime)

export async function POST(req: NextRequest) {
  // Replay protection: insert update_id; PK conflict = replayed update, drop silently
  let body: any = null
  try {
    const cloned = req.clone()
    body = await cloned.json()
  } catch { /* body parsing failed — pass through to grammy for its own validation */ }

  const updateId = body?.update_id
  if (typeof updateId === 'number') {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('telegram_update_log')
      .insert({ update_id: updateId })
    if (error && error.code === '23505') {
      // Duplicate key — replayed update, drop silently with 200 so Telegram stops retrying
      return new Response('ok', { status: 200 })
    }
  }

  // Delegate to grammY webhook handler
  const handler = webhookCallback(getBot(), 'std/http', {
    secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
    onTimeout: 'return',
    timeoutMilliseconds: 9_000,
  })

  return handler(req)
}
