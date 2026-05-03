import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyMembership } from '@/lib/auth/membership-proof'

// Build a chain mock helper — reusable across test cases
function buildChain(returnedData: { id: string } | null) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.limit = vi.fn(() => chain)
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: returnedData, error: null }))
  return chain
}

function buildErrorChain() {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.limit = vi.fn(() => chain)
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: new Error('db boom') }))
  return chain
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => buildChain(null)),
  })),
}))

describe('verifyMembership', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns true when organization_users row exists with is_active=true', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn(() => buildChain({ id: 'mem-uuid' })),
    })
    const result = await verifyMembership('user-uuid', 'org-uuid')
    expect(result).toBe(true)
  })

  it('returns false when no row found', async () => {
    // Default mock returns null data
    const result = await verifyMembership('user-uuid', 'org-uuid')
    expect(result).toBe(false)
  })

  it('returns false on DB error (treats as no membership)', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn(() => buildErrorChain()),
    })
    const result = await verifyMembership('user-uuid', 'org-uuid')
    expect(result).toBe(false)
  })
})
