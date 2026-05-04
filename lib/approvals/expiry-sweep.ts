/**
 * lib/approvals/expiry-sweep.ts
 * Vercel cron fallback for expiry sweep.
 * pg-cron Job 1 (migration 25) does the same work inline on a 5-min schedule.
 * This function exists for the non-pg_net path or as a manual trigger.
 *
 * Calls sweep_expired_approvals() plpgsql function (migration 25) via RPC.
 * That function:
 *   1. UPDATEs pending rows with expires_at < now() to status='expired'
 *   2. INSERTs __expiry_notify__ approval_jobs for worker pickup
 */

import { createAdminClient } from '@/lib/supabase/admin'

export async function sweepExpiredApprovals(): Promise<{ expired: number }> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('sweep_expired_approvals')
  if (error) throw error
  return { expired: (data as any)?.expired ?? 0 }
}
