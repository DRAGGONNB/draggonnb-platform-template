import { pauseSaga } from '@/lib/provisioning/saga-state'

/**
 * Phase 10 (ONBOARD-07): NO cascade-delete. PAUSE the saga and alert ops.
 *
 * Historical context: Before Phase 10, rollback() deleted the organization row via CASCADE,
 * destroying all customer data if any saga step 5-9 failed. This was unrecoverable for
 * paying customers.
 *
 * New behaviour:
 * - Steps 1-4 failures are caught BEFORE org creation and return errors directly to the caller
 *   (no rollback needed — nothing to undo).
 * - Steps 5-9 (+ step 10) failures land here: the org exists and is fully usable (ONBOARD-08).
 *   We PAUSE the job, store current_step + error_message in provisioning_jobs, and post a
 *   Telegram alert so ops can review and resume.
 * - Operator resumes via POST /api/ops/provisioning-resume {jobId} + pnpm run provisioning:resume <jobId>
 *
 * The 'rolled_back' SagaStatus is preserved as a valid value (used by 09-era code) but
 * is no longer set by this function.
 */
export async function rollback(
  jobId: string,
  currentStep: number,
  error: Error,
  createdResources: Record<string, unknown>
): Promise<void> {
  await pauseSaga(jobId, currentStep, error.message, createdResources)
}

// ---------------------------------------------------------------------------
// Legacy rollback actions — kept as dead code stubs for reference.
// These are NOT called by the new rollback() above. Retained so that any
// external caller that imported rollbackActions won't have a compile error.
// They will be removed in a future cleanup pass (Phase 11 backlog).
// ---------------------------------------------------------------------------

export const rollbackActions = {
  /** @deprecated — use pauseSaga instead. Left as a no-op to avoid import errors. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async organization(_organizationId: string): Promise<void> {
    console.warn('rollbackActions.organization called — this is a no-op in Phase 10+. Use pauseSaga.')
  },
  /** @deprecated */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async supabase(_projectId: string): Promise<void> {},
  /** @deprecated */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async github(_repoName: string): Promise<void> {},
  /** @deprecated */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async vercel(_projectId: string): Promise<void> {},
  /** @deprecated */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async n8n(_workflowId: string): Promise<void> {},
}

/** @deprecated — preserved for import compat only. Use rollback() instead. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function rollbackProvisioning(_resources: Record<string, unknown>): Promise<void> {
  console.warn('rollbackProvisioning called — this is a no-op in Phase 10+. Saga uses PAUSE instead.')
}
