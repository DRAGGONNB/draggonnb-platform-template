/**
 * CAMP-08: First 30 days of a new tenant default to draft-then-review.
 *
 * `isInNewTenantPeriod()` is the single source of truth for the new-tenant
 * enforcement gate. It is read by /api/campaigns/[id]/schedule (Plan 11-11)
 * to coerce campaign status to 'pending_review' regardless of request body
 * when the org is in its first 30 days.
 *
 * Override path: campaigns.force_review = true (set by platform_admin) skips
 * this gate. Note: the column name is counter-intuitive — force_review=true
 * means an admin has EXPLICITLY OVERRIDDEN the new-tenant restriction for
 * that specific campaign.
 *
 * COLUMN FALLBACK NOTE (2026-04-27):
 * `organizations.activated_at` is present in the initial migration file
 * (supabase/migrations/00_initial_schema.sql:28) but is NOT present in the
 * live Supabase project (verified via information_schema.columns query).
 * The live DB only has `created_at` and `archived_at` on the organizations
 * table. This function therefore uses `created_at` as a proxy for activation
 * date (equating org creation with activation is accurate for current orgs —
 * all existing orgs were activated at the time of provisioning).
 *
 * Phase 12 TODO: Add `activated_at` column via migration and switch this
 * function to use it once backfilled. New subscriptions detected by
 * `!org.activated_at` (09-02 decision) should set it at ITN time.
 */

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Returns true if the tenant is within its first 30 days of activation,
 * OR if the activation date cannot be determined (defensive — unknown = new).
 *
 * Fallback: uses `created_at` because `activated_at` is absent from live DB.
 * See module-level comment above.
 */
export async function isInNewTenantPeriod(orgId: string): Promise<boolean> {
  const supabase = createAdminClient()

  // NOTE: using created_at — activated_at column absent from live DB (see comment above)
  const { data, error } = await supabase
    .from('organizations')
    .select('created_at')
    .eq('id', orgId)
    .single()

  if (error || !data?.created_at) {
    // Unknown activation = treat as new tenant (defensive)
    return true
  }

  const createdAt = new Date(data.created_at as string)
  const daysSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  return daysSince < 30
}
