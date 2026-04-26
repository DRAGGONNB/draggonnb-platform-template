import { getUserOrg } from '@/lib/auth/get-user-org'
import { getOrgOnboardingProgress } from '@/lib/onboarding/progress'

/**
 * GET /api/ops/onboarding-progress
 *
 * Returns the current org's onboarding_progress row.
 * Used by the dashboard to render the 4-step checklist.
 * Returns empty object {} if no progress row exists yet (org just provisioned).
 */
export async function GET() {
  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return Response.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const progress = await getOrgOnboardingProgress(userOrg.organizationId)
  return Response.json(progress ?? {})
}
