import { NextRequest } from 'next/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { resumeSaga } from '@/lib/provisioning/saga-state'

/**
 * POST /api/ops/provisioning-resume
 *
 * Flips a paused provisioning job to 'running' and returns 202 with CLI continuation
 * instructions. The actual step replay runs via the CLI to avoid Vercel's 60-second
 * function timeout (step 5: N8N workflow creation can take >60s).
 *
 * Body: { jobId: string }
 * Returns: 202 { ok, status, jobId, currentStep, next_action }
 *
 * Auth: platform_admin or admin role required.
 */
export async function POST(req: NextRequest) {
  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return Response.json({ error: 'unauthenticated' }, { status: 401 })
  }

  // Platform admin only
  if (userOrg.role !== 'platform_admin' && userOrg.role !== 'admin') {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: { jobId?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { jobId } = body
  if (!jobId) {
    return Response.json({ error: 'jobId_required' }, { status: 400 })
  }

  try {
    const state = await resumeSaga(jobId)
    // Flip to 'running' is done inside resumeSaga. Return 202 with CLI instruction.
    // Operator runs `pnpm run provisioning:resume <jobId>` from dev machine (unbounded runtime).
    return Response.json(
      {
        ok: true,
        status: 'resumed',
        jobId: state.jobId,
        currentStep: state.currentStep,
        next_action: `Run: pnpm run provisioning:resume ${state.jobId}`,
      },
      { status: 202 }
    )
  } catch (err) {
    return Response.json(
      { error: 'resume_failed', detail: (err as Error).message },
      { status: 500 }
    )
  }
}
