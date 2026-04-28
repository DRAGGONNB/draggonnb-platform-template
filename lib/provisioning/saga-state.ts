import { createAdminClient } from '@/lib/supabase/admin'

export type SagaStatus = 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back' | 'paused'

export interface SagaState {
  jobId: string
  organizationId: string
  status: SagaStatus
  currentStep: number
  stepsCompleted: string[]
  createdResources: Record<string, unknown>
  errorMessage: string | null
}

/**
 * Transition a provisioning job to PAUSED status.
 * ONBOARD-07: replaces cascade-delete rollback. Org stays alive and usable.
 * Posts a Telegram alert to TELEGRAM_OPS_CHAT_ID (non-blocking — failure is swallowed).
 */
export async function pauseSaga(
  jobId: string,
  currentStep: number,
  errorMessage: string,
  createdResources: Record<string, unknown>
): Promise<void> {
  const supa = createAdminClient()
  await supa
    .from('provisioning_jobs')
    .update({
      status: 'paused',
      current_step: currentStep,
      error_message: errorMessage,
      created_resources: createdResources,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  // Telegram alert — non-blocking, swallow failures (pausing must succeed regardless)
  await sendOpsTelegramAlert({
    title: 'Provisioning saga PAUSED',
    body:
      `Job ${jobId} paused at step ${currentStep}.\n` +
      `Error: ${errorMessage}\n` +
      `Resume via: POST /api/ops/provisioning-resume {"jobId":"${jobId}"}\n` +
      `Then run: pnpm run provisioning:resume ${jobId}`,
  }).catch((err) => console.error('Telegram alert failed (non-fatal):', err))
}

/**
 * Resume a paused provisioning job — flips status to 'running' and returns the current saga state.
 * The actual step replay is done by the CLI (scripts/provisioning/resume.ts).
 */
export async function resumeSaga(jobId: string): Promise<SagaState> {
  const supa = createAdminClient()
  const { data, error } = await supa
    .from('provisioning_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !data) throw new Error(`Job ${jobId} not found`)
  if (data.status !== 'paused')
    throw new Error(`Job ${jobId} is ${data.status}, not paused — cannot resume`)

  await supa.from('provisioning_jobs').update({ status: 'running' }).eq('id', jobId)

  return {
    jobId: data.id,
    organizationId: data.organization_id,
    status: 'running',
    currentStep: data.current_step ?? 1,
    stepsCompleted: (data.steps_completed as string[]) ?? [],
    createdResources: (data.created_resources as Record<string, unknown>) ?? {},
    errorMessage: null,
  }
}

async function sendOpsTelegramAlert(opts: { title: string; body: string }): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_OPS_CHAT_ID
  if (!token || !chatId) return // env not set in dev — silent
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: `${opts.title}\n\n${opts.body}`,
      parse_mode: 'Markdown',
    }),
  })
}
