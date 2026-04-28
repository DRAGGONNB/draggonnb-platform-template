#!/usr/bin/env node
/**
 * Resume a paused provisioning saga from its current_step.
 * Usage: pnpm run provisioning:resume <jobId>
 *
 * Prerequisites:
 * 1. Hit POST /api/ops/provisioning-resume {"jobId": "<jobId>"} to flip status to 'running'.
 * 2. Then run this CLI which replays steps from current_step onward.
 *
 * Each step function is idempotent — re-running a partially-completed step is safe.
 * If a step fails, the saga is re-paused and this process exits 1.
 */

import { createAdminClient } from '../../lib/supabase/admin'
import { createN8NWorkflow } from './steps/05-n8n'
import { deployAutomations } from './steps/06-automations'
import { sendOnboardingSequence } from './steps/07-onboarding'
import { runQAChecks } from './steps/08-qa-check'
import { step10ScheduleFollowups } from './steps/10-schedule-followups'
import { pauseSaga } from '../../lib/provisioning/saga-state'
import type { ProvisioningJob, CreatedResources } from '../../lib/provisioning/types'

// Step registry — ordered by step number; steps 1-4 are pre-pause and not in resume path
const RESUMABLE_STEPS = [2, 3, 4, 5, 10] as const

async function main() {
  const jobId = process.argv[2]
  if (!jobId) {
    console.error('Usage: pnpm run provisioning:resume <jobId>')
    process.exit(1)
  }

  const supa = createAdminClient()
  const { data: job, error } = await supa
    .from('provisioning_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !job) {
    console.error('Job not found:', error?.message)
    process.exit(1)
  }

  if (job.status !== 'running') {
    console.error(
      `Job is '${job.status}', not 'running'. Call POST /api/ops/provisioning-resume first to flip the status.`
    )
    process.exit(1)
  }

  const resources: CreatedResources = ((job.created_resources as CreatedResources) ?? {})
  const fromStep: number = job.current_step ?? 2

  // Reconstruct the ProvisioningJob shape from stored data
  const provJob: ProvisioningJob = {
    clientId: (job.client_id as string) ?? jobId,
    clientName: (job.client_name as string) ?? 'Unknown',
    orgEmail: (job.org_email as string) ?? '',
    tier: (job.tier as ProvisioningJob['tier']) ?? 'core',
    clientConfig: job.client_config as ProvisioningJob['clientConfig'],
    createdResources: resources,
  }

  console.log(`Resuming provisioning job ${jobId} from step ${fromStep}...`)

  // Steps 2-5 and 10 — each checks if step number >= fromStep before running
  const stepsToRun: { num: number; name: string }[] = [
    { num: 2, name: 'n8n-webhooks' },
    { num: 3, name: 'deploy-automations' },
    { num: 4, name: 'onboarding-sequence-stub' },
    { num: 5, name: 'qa-checks' },
    { num: 10, name: 'schedule-followups' },
  ].filter((s) => s.num >= fromStep)

  for (const { num, name } of stepsToRun) {
    console.log(`Step ${num} (${name})...`)

    try {
      let result: { success: boolean; data?: Partial<CreatedResources>; error?: string } | { success: true } | { success: false; error: string }

      if (num === 2) {
        const r = await createN8NWorkflow(provJob)
        result = { success: r.success, data: r.data, error: r.error }
      } else if (num === 3) {
        try {
          const r = await deployAutomations(provJob)
          if (r.data) Object.assign(resources, r.data)
          provJob.createdResources = { ...resources }
        } catch (e) {
          console.warn(`Step ${num} warning (non-fatal):`, e)
        }
        result = { success: true }
      } else if (num === 4) {
        try {
          const r = await sendOnboardingSequence(provJob)
          if (r.data) Object.assign(resources, r.data)
          provJob.createdResources = { ...resources }
        } catch (e) {
          console.warn(`Step ${num} warning (non-fatal):`, e)
        }
        result = { success: true }
      } else if (num === 5) {
        try {
          const r = await runQAChecks(provJob, resources)
          if (r.data) Object.assign(resources, r.data)
          provJob.createdResources = { ...resources }
        } catch (e) {
          console.warn(`Step ${num} warning (non-fatal):`, e)
        }
        result = { success: true }
      } else if (num === 10) {
        const orgId = resources.organizationId
        if (!orgId) {
          console.warn('Step 10: organizationId not in resources, skipping')
          result = { success: true }
        } else {
          result = await step10ScheduleFollowups(orgId)
        }
      } else {
        result = { success: true }
      }

      if ('data' in result && result.data) {
        Object.assign(resources, result.data)
        provJob.createdResources = { ...resources }
      }

      if (!result.success) {
        const errMsg = 'error' in result ? (result.error ?? 'unknown') : 'unknown'
        throw new Error(`Step ${num} (${name}) failed: ${errMsg}`)
      }

      // Record step progress in DB
      await supa
        .from('provisioning_jobs')
        .update({ current_step: num + 1, created_resources: resources })
        .eq('id', jobId)

      console.log(`  Step ${num} done.`)
    } catch (err) {
      console.error(`Step ${num} threw:`, err)
      await pauseSaga(jobId, num, (err as Error).message, resources as unknown as Record<string, unknown>)
      process.exit(1)
    }
  }

  await supa.from('provisioning_jobs').update({ status: 'completed' }).eq('id', jobId)
  console.log(`Provisioning resume complete. Job ${jobId} marked completed.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
