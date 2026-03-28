import { describe, it, expect, vi, beforeEach } from 'vitest'
import { testApiHandler } from 'next-test-api-route-handler'

// Mock modules
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns db_connectivity check when unauthenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')

    // Admin client for DB check - success
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          limit: vi.fn(() => ({
            data: [{ id: 'test' }],
            error: null,
          })),
        })),
      })),
    } as any)

    // User client - not authenticated
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    } as any)

    const routeModule = await import('@/app/api/health/route')

    await testApiHandler({
      appHandler: routeModule as any,
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET' })
        const data = await response.json()

        expect(data.checks).toBeDefined()
        expect(data.checks.length).toBeGreaterThanOrEqual(1)

        const dbCheck = data.checks.find((c: { name: string }) => c.name === 'db_connectivity')
        expect(dbCheck).toBeDefined()
        expect(dbCheck.status).toBe('pass')
      },
    })
  })

  it('returns full check suite when authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')

    const mockOrgId = 'test-org-id'

    // Admin client
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'organizations') {
          return {
            select: vi.fn(() => ({
              limit: vi.fn(() => ({ data: [{ id: mockOrgId }], error: null })),
              eq: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: { name: 'Test Org', subscription_tier: 'growth' },
                  error: null,
                })),
              })),
            })),
          }
        }
        return {
          select: vi.fn(() => ({
            limit: vi.fn(() => ({ data: [], error: null })),
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [{ organization_id: mockOrgId, organizations: { subscription_tier: 'growth' } }],
                error: null,
              })),
            })),
          })),
        }
      }),
    } as any)

    // User client - authenticated
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@test.com' } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(function (this: unknown) { return this }),
          order: vi.fn(() => ({
            data: [{ organization_id: mockOrgId, organizations: { subscription_tier: 'growth' } }],
            error: null,
          })),
          limit: vi.fn(() => ({
            data: [{ id: 'test' }],
            error: null,
          })),
        })),
      })),
    } as any)

    const routeModule = await import('@/app/api/health/route')

    await testApiHandler({
      appHandler: routeModule as any,
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET' })
        const data = await response.json()

        expect(data.checks).toBeDefined()

        const authCheck = data.checks.find((c: { name: string }) => c.name === 'auth')
        expect(authCheck).toBeDefined()
        expect(authCheck.status).toBe('pass')

        const orgCheck = data.checks.find((c: { name: string }) => c.name === 'org_resolution')
        expect(orgCheck).toBeDefined()
      },
    })
  })
})
