import { createAdminClient } from '@/lib/supabase/admin'
import { computeTimerStartDay } from '@/lib/provisioning/business-days'
import { sendWelcomeDay0 } from '@/emails/welcome-day0'

/**
 * Provisioning Step 10 — Schedule Onboarding Followups (ONBOARD-06)
 *
 * Writes the onboarding_progress timer state for the new org and immediately
 * sends the Day 0 welcome email (transactional — exempt from POPI unsubscribe).
 *
 * Day 1/2/3 emails are NOT sent here — the N8N cron workflows poll
 * onboarding_progress by timer_start_day + business-day offset and hit
 * POST /api/n8n/onboarding-day idempotently.
 */
export async function step10ScheduleFollowups(
  orgId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supa = createAdminClient()
  const now = new Date()
  const timerStartDay = computeTimerStartDay(now)

  // Upsert onboarding_progress row — idempotent if step 10 is re-run during saga resume
  const { error: upsertErr } = await supa.from('onboarding_progress').upsert(
    {
      organization_id: orgId,
      timer_started_at: now.toISOString(),
      timer_start_day: timerStartDay,
      current_day: 0,
    },
    { onConflict: 'organization_id' }
  )
  if (upsertErr) {
    return { success: false, error: `progress upsert failed: ${upsertErr.message}` }
  }

  // Send Day 0 welcome email immediately (transactional — no scheduling required)
  const sendErr = await sendWelcomeDay0(orgId)
  if (sendErr) {
    return { success: false, error: `welcome email send failed: ${sendErr}` }
  }

  // Day 1/2/3 are NOT enqueued here. The N8N cron workflows find orgs
  // by timer_start_day + business-day offset and call /api/n8n/onboarding-day.
  return { success: true }
}
