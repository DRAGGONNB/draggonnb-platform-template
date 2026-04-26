import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Stamp the appropriate dayN_email_sent_at column in onboarding_progress.
 * Day 0 stamps day0_completed_at (which is set on provisioning step 10).
 */
export async function recordEmailSent(orgId: string, day: 0 | 1 | 2 | 3): Promise<void> {
  const supa = createAdminClient()
  const col = day === 0 ? 'day0_completed_at' : `day${day}_email_sent_at`
  await supa
    .from('onboarding_progress')
    .update({ [col]: new Date().toISOString() })
    .eq('organization_id', orgId)
}

/**
 * Append a drift flag to onboarding_progress.drift_flags using SELECT-then-UPDATE.
 *
 * IMPORTANT: There is no `array_append_drift_flag` RPC in the DB (ONBOARD plan requirement).
 * Use read-append-update pattern. Race window is acceptable — drift flags are advisory
 * (operator notification, not transactional state). Worst case: one flag is dropped under
 * concurrent write. Deduplication prevents double entries.
 */
export async function recordDriftFlag(orgId: string, flag: string): Promise<void> {
  const supa = createAdminClient()

  const { data: existing } = await supa
    .from('onboarding_progress')
    .select('drift_flags')
    .eq('organization_id', orgId)
    .maybeSingle()

  const current: string[] = (existing?.drift_flags as string[] | null) ?? []
  if (current.includes(flag)) return // dedupe — don't append if already present

  const next = [...current, flag]
  await supa
    .from('onboarding_progress')
    .update({ drift_flags: next })
    .eq('organization_id', orgId)
}

/**
 * Read the full onboarding_progress row for an org.
 * Used by the dashboard checklist (rendered in the UI via GET /api/ops/onboarding-progress).
 */
export async function getOrgOnboardingProgress(orgId: string) {
  const supa = createAdminClient()
  const { data } = await supa
    .from('onboarding_progress')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle()
  return data
}
