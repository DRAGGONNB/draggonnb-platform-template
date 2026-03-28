import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock modules before importing
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { getOrgId } from '@/lib/auth/get-user-org'
import { createChainableMock } from '../../helpers/api-test-utils'

function createMockClient(rows: Array<{ organization_id: string; organizations: { subscription_tier: string } }>) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(function (this: unknown) { return this }),
        order: vi.fn(() => ({
          data: rows,
          error: null,
        })),
      })),
    })),
  } as any
}

describe('getOrgId - org resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the single org when user has one membership', async () => {
    const mock = createMockClient([
      { organization_id: 'org-1', organizations: { subscription_tier: 'starter' } },
    ])

    const result = await getOrgId(mock, 'user-1')
    expect(result).toBe('org-1')
  })

  it('picks the highest-tier org when user has multiple', async () => {
    const mock = createMockClient([
      { organization_id: 'org-starter', organizations: { subscription_tier: 'starter' } },
      { organization_id: 'org-growth', organizations: { subscription_tier: 'professional' } },
    ])

    const result = await getOrgId(mock, 'user-1')
    expect(result).toBe('org-growth')
  })

  it('picks scale over growth when both exist', async () => {
    const mock = createMockClient([
      { organization_id: 'org-growth', organizations: { subscription_tier: 'growth' } },
      { organization_id: 'org-scale', organizations: { subscription_tier: 'scale' } },
    ])

    const result = await getOrgId(mock, 'user-1')
    expect(result).toBe('org-scale')
  })

  it('picks platform_admin over everything', async () => {
    const mock = createMockClient([
      { organization_id: 'org-scale', organizations: { subscription_tier: 'scale' } },
      { organization_id: 'org-admin', organizations: { subscription_tier: 'platform_admin' } },
    ])

    const result = await getOrgId(mock, 'user-1')
    expect(result).toBe('org-admin')
  })

  it('treats professional as equal to growth', async () => {
    const mock = createMockClient([
      { organization_id: 'org-core', organizations: { subscription_tier: 'core' } },
      { organization_id: 'org-pro', organizations: { subscription_tier: 'professional' } },
    ])

    const result = await getOrgId(mock, 'user-1')
    expect(result).toBe('org-pro')
  })

  it('treats enterprise as equal to scale', async () => {
    const mock = createMockClient([
      { organization_id: 'org-growth', organizations: { subscription_tier: 'growth' } },
      { organization_id: 'org-ent', organizations: { subscription_tier: 'enterprise' } },
    ])

    const result = await getOrgId(mock, 'user-1')
    expect(result).toBe('org-ent')
  })

  it('returns null when user has no memberships', async () => {
    const mock = createMockClient([])

    // Also mock admin client to return empty
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(createMockClient([]) as any)

    const result = await getOrgId(mock, 'user-1')
    expect(result).toBeNull()
  })

  it('falls back to admin client when user client returns empty', async () => {
    const userMock = createMockClient([])
    const adminMock = createMockClient([
      { organization_id: 'org-admin-found', organizations: { subscription_tier: 'growth' } },
    ])

    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(adminMock as any)

    const result = await getOrgId(userMock, 'user-1')
    expect(result).toBe('org-admin-found')
  })
})
