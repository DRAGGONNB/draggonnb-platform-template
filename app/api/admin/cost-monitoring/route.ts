import { getUserOrg } from '@/lib/auth/get-user-org'
import { getCostMonitoringRows } from '@/lib/admin/cost-monitoring'

/**
 * GET /api/admin/cost-monitoring
 *
 * Returns per-org cost vs MRR data for the cost monitoring dashboard.
 * Restricted to 'admin' role (platform operator).
 *
 * REQ: USAGE-11
 */
export async function GET() {
  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return Response.json({ error: 'unauthenticated' }, { status: 401 })
  }

  // user_role enum: {admin, manager, user, client} (Phase 09-01 decision)
  // Platform admin = role 'admin'. 'platform_admin' is not a valid role enum value.
  if (userOrg.role !== 'admin') {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const rows = await getCostMonitoringRows()
    return Response.json({ rows, generatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('[cost-monitoring] fetch failed:', err)
    return Response.json(
      { error: 'fetch_failed', detail: (err as Error).message },
      { status: 500 },
    )
  }
}
