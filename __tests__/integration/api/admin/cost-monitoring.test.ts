/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { testApiHandler } from 'next-test-api-route-handler'

// Mock getUserOrg so we can control auth/role in tests
vi.mock('@/lib/auth/get-user-org', () => ({
  getUserOrg: vi.fn(),
}))

// Mock getCostMonitoringRows so we don't hit Supabase
vi.mock('@/lib/admin/cost-monitoring', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/admin/cost-monitoring')>()
  return {
    ...original,
    getCostMonitoringRows: vi.fn(),
  }
})

import { getUserOrg } from '@/lib/auth/get-user-org'
import { getCostMonitoringRows } from '@/lib/admin/cost-monitoring'

const MOCK_ADMIN_USER = {
  userId: 'user-1',
  email: 'admin@draggonnb.co.za',
  fullName: 'Platform Admin',
  organizationId: 'org-1',
  role: 'admin',
  organization: {
    id: 'org-1',
    name: 'DraggonnB Business Automation',
    subscription_tier: 'scale',
    subscription_status: 'active',
  },
}

const MOCK_MANAGER_USER = {
  ...MOCK_ADMIN_USER,
  role: 'manager',
}

const MOCK_COST_ROWS = [
  {
    orgId: 'org-1',
    orgName: 'Test Org',
    subdomain: 'testorg',
    costMTDZarCents: 5000,
    mrrZarCents: 119900,
    marginPct: 95.83,
    isOverFortyPctMrrFlag: false,
    last30DaysCostTrend: [],
  },
]

describe('GET /api/admin/cost-monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUserOrg).mockResolvedValue({ data: null, error: 'Not authenticated' })

    const routeModule = await import('@/app/api/admin/cost-monitoring/route')

    await testApiHandler({
      appHandler: routeModule as any,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' })
        expect(res.status).toBe(401)
        const body = await res.json()
        expect(body.error).toBe('unauthenticated')
      },
    })
  })

  it('returns 403 when authed as role "manager" (non-admin)', async () => {
    vi.mocked(getUserOrg).mockResolvedValue({ data: MOCK_MANAGER_USER, error: null })

    const routeModule = await import('@/app/api/admin/cost-monitoring/route')

    await testApiHandler({
      appHandler: routeModule as any,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' })
        expect(res.status).toBe(403)
        const body = await res.json()
        expect(body.error).toBe('forbidden')
      },
    })
  })

  it('returns 403 when authed as role "user"', async () => {
    vi.mocked(getUserOrg).mockResolvedValue({
      data: { ...MOCK_ADMIN_USER, role: 'user' },
      error: null,
    })

    const routeModule = await import('@/app/api/admin/cost-monitoring/route')

    await testApiHandler({
      appHandler: routeModule as any,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' })
        expect(res.status).toBe(403)
      },
    })
  })

  it('returns 200 with rows and generatedAt when authed as "admin"', async () => {
    vi.mocked(getUserOrg).mockResolvedValue({ data: MOCK_ADMIN_USER, error: null })
    vi.mocked(getCostMonitoringRows).mockResolvedValue(MOCK_COST_ROWS)

    const routeModule = await import('@/app/api/admin/cost-monitoring/route')

    await testApiHandler({
      appHandler: routeModule as any,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.rows).toHaveLength(1)
        expect(body.rows[0].orgName).toBe('Test Org')
        expect(body.generatedAt).toBeDefined()
      },
    })
  })

  it('returns 500 when DB fetch throws', async () => {
    vi.mocked(getUserOrg).mockResolvedValue({ data: MOCK_ADMIN_USER, error: null })
    vi.mocked(getCostMonitoringRows).mockRejectedValue(new Error('Connection timeout'))

    const routeModule = await import('@/app/api/admin/cost-monitoring/route')

    await testApiHandler({
      appHandler: routeModule as any,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' })
        expect(res.status).toBe(500)
        const body = await res.json()
        expect(body.error).toBe('fetch_failed')
        expect(body.detail).toBe('Connection timeout')
      },
    })
  })
})
