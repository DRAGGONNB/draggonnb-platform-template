/** @vitest-environment node */
/**
 * sweepExpiredApprovals() unit tests.
 *
 * Checks:
 *   1. calls sweep_expired_approvals() RPC on admin client
 *   2. returns { expired: N } from RPC data
 *   3. returns { expired: 0 } when RPC data has no expired field
 *   4. throws when RPC returns an error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

let mockRpc: ReturnType<typeof vi.fn>

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc: (...a: any[]) => mockRpc(...a),
  }),
}))

import { sweepExpiredApprovals } from '@/lib/approvals/expiry-sweep'

describe('sweepExpiredApprovals()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls sweep_expired_approvals() RPC', async () => {
    mockRpc = vi.fn().mockResolvedValue({ data: { expired: 3 }, error: null })
    await sweepExpiredApprovals()
    expect(mockRpc).toHaveBeenCalledWith('sweep_expired_approvals')
  })

  it('returns { expired: N } from RPC data', async () => {
    mockRpc = vi.fn().mockResolvedValue({ data: { expired: 7 }, error: null })
    const result = await sweepExpiredApprovals()
    expect(result).toEqual({ expired: 7 })
  })

  it('returns { expired: 0 } when RPC data does not have expired field', async () => {
    mockRpc = vi.fn().mockResolvedValue({ data: {}, error: null })
    const result = await sweepExpiredApprovals()
    expect(result).toEqual({ expired: 0 })
  })

  it('returns { expired: 0 } when RPC data is null', async () => {
    mockRpc = vi.fn().mockResolvedValue({ data: null, error: null })
    const result = await sweepExpiredApprovals()
    expect(result).toEqual({ expired: 0 })
  })

  it('throws when RPC returns an error', async () => {
    mockRpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'function not found' } })
    await expect(sweepExpiredApprovals()).rejects.toMatchObject({ message: 'function not found' })
  })
})
