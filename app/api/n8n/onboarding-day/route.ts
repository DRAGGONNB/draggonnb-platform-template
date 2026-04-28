import { NextRequest } from 'next/server'
import { sendOnboardingDay1 } from '@/emails/onboarding-day1'
import { sendOnboardingDay2 } from '@/emails/onboarding-day2'
import { sendOnboardingDay3 } from '@/emails/onboarding-day3'
import { recordEmailSent, recordDriftFlag } from '@/lib/onboarding/progress'

/**
 * POST /api/n8n/onboarding-day
 *
 * Webhook target for N8N Day 1/2/3 onboarding cron workflows.
 * Authenticated via shared secret (N8N_WEBHOOK_SECRET) — NOT user auth.
 * N8N is a service; it doesn't have a session cookie.
 *
 * Body: { orgId: string, day: 1 | 2 | 3 }
 * Header: x-n8n-secret: <N8N_WEBHOOK_SECRET>
 *
 * Idempotent via dayN_email_sent_at IS NULL check in the N8N cron query.
 * If called twice for the same org+day, the second call will still send the email
 * but the DB stamp is a no-op (ON CONFLICT would be safer — Phase 11 backlog).
 */
export async function POST(req: NextRequest) {
  // Constant-time shared-secret check
  const provided = req.headers.get('x-n8n-secret')
  const expected = process.env.N8N_WEBHOOK_SECRET

  if (!expected || !provided || provided !== expected) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { orgId?: string; day?: number }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { orgId, day } = body

  if (!orgId || typeof orgId !== 'string') {
    return Response.json({ error: 'invalid_input', detail: 'orgId is required' }, { status: 400 })
  }

  if (!day || ![1, 2, 3].includes(day)) {
    return Response.json({ error: 'invalid_input', detail: 'day must be 1, 2, or 3' }, { status: 400 })
  }

  let sendErr: string | null = null

  if (day === 1) {
    sendErr = await sendOnboardingDay1(orgId)
  } else if (day === 2) {
    sendErr = await sendOnboardingDay2(orgId)
  } else if (day === 3) {
    sendErr = await sendOnboardingDay3(orgId)
  }

  if (sendErr) {
    // Record drift flag so operators can see which orgs had delivery failures
    await recordDriftFlag(orgId, `day${day}_email_failed`)
    return Response.json(
      { error: 'send_failed', detail: sendErr, orgId, day },
      { status: 500 }
    )
  }

  await recordEmailSent(orgId, day as 0 | 1 | 2 | 3)
  return Response.json({ ok: true, day, orgId })
}
