import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgId } from '@/lib/auth/get-user-org'
import { checkFeatureAccess, normalizeTier } from '@/lib/tier/feature-gate'
import type { Feature } from '@/lib/tier/feature-gate'

interface HealthCheck {
  name: string
  status: 'pass' | 'fail'
  detail?: string
  ms?: number
}

/**
 * GET /api/health - Platform health check
 *
 * Unauthenticated: returns basic DB connectivity.
 * Authenticated: returns full auth chain + org resolution + tier gating + table access checks.
 */
export async function GET() {
  const checks: HealthCheck[] = []
  const start = Date.now()

  // Check 1: DB connectivity
  try {
    const admin = createAdminClient()
    const t0 = Date.now()
    const { error } = await admin.from('organizations').select('id').limit(1)
    checks.push({
      name: 'db_connectivity',
      status: error ? 'fail' : 'pass',
      detail: error?.message,
      ms: Date.now() - t0,
    })
  } catch (e) {
    checks.push({ name: 'db_connectivity', status: 'fail', detail: String(e) })
  }

  // Check 2: Auth (optional - only if user is logged in)
  let userId: string | null = null
  let orgId: string | null = null
  let tier: string | null = null

  try {
    const supabase = await createClient()
    const t0 = Date.now()
    const { data: { user }, error } = await supabase.auth.getUser()
    const authMs = Date.now() - t0

    if (user && !error) {
      userId = user.id
      checks.push({
        name: 'auth',
        status: 'pass',
        detail: user.email,
        ms: authMs,
      })

      // Check 3: Org resolution
      const t1 = Date.now()
      orgId = await getOrgId(supabase, user.id)
      checks.push({
        name: 'org_resolution',
        status: orgId ? 'pass' : 'fail',
        detail: orgId ? `org_id: ${orgId}` : 'No organization found for user',
        ms: Date.now() - t1,
      })

      // Check 4: Get tier
      if (orgId) {
        const admin = createAdminClient()
        const { data: org } = await admin
          .from('organizations')
          .select('name, subscription_tier')
          .eq('id', orgId)
          .single()

        tier = org?.subscription_tier ?? null
        checks.push({
          name: 'org_tier',
          status: tier ? 'pass' : 'fail',
          detail: tier ? `${org?.name} (${tier})` : 'Could not fetch org tier',
        })

        // Check 5: Feature gating for all modules
        if (tier) {
          const normalizedTier = normalizeTier(tier)
          const modules: Feature[] = [
            'social_posts', 'email_sends', 'ai_generations',
            'accommodation_module', 'api_access', 'business_autopilot',
          ]
          for (const mod of modules) {
            const access = checkFeatureAccess(normalizedTier, mod)
            checks.push({
              name: `feature_gate:${mod}`,
              status: access.allowed ? 'pass' : 'fail',
              detail: access.allowed ? `allowed (${normalizedTier})` : access.reason,
            })
          }
        }

        // Check 6: Sample table queries
        const tables = [
          { table: 'organization_users', filter: { organization_id: orgId } },
        ] as const

        for (const { table, filter } of tables) {
          const t2 = Date.now()
          const { error: tableError } = await supabase
            .from(table)
            .select('id')
            .eq('organization_id', filter.organization_id)
            .limit(1)
          checks.push({
            name: `table_access:${table}`,
            status: tableError ? 'fail' : 'pass',
            detail: tableError?.message,
            ms: Date.now() - t2,
          })
        }
      }
    } else {
      checks.push({
        name: 'auth',
        status: 'fail',
        detail: 'Not authenticated (unauthenticated health check)',
        ms: authMs,
      })
    }
  } catch (e) {
    checks.push({ name: 'auth', status: 'fail', detail: String(e) })
  }

  const allPassed = checks.every((c) => c.status === 'pass')

  return NextResponse.json({
    status: allPassed ? 'healthy' : 'degraded',
    total_ms: Date.now() - start,
    checks,
  }, { status: allPassed ? 200 : 503 })
}
