/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockEq = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
const mockFrom = vi.fn().mockReturnValue({
  update: mockUpdate,
  insert: mockInsert,
  select: vi.fn().mockReturnThis(),
  eq: mockEq,
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

vi.mock('@/lib/payments/payfast', () => ({
  getPayFastConfig: vi.fn(() => ({
    mode: 'sandbox',
    merchantId: 'test-merchant',
  })),
}))

vi.mock('@/lib/billing/plans', () => ({
  comparePlans: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('handlePaymentFailed — subscription_history INSERT', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock chains
    mockInsert.mockResolvedValue({ error: null })
    mockEq.mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({
      update: mockUpdate,
      insert: mockInsert,
      select: vi.fn().mockReturnThis(),
      eq: mockEq,
    })
  })

  it('inserts into subscription_history with correct shape on payment failure', async () => {
    const { handlePaymentFailed } = await import('@/lib/billing/subscriptions')

    const orgId = 'test-org-id'
    const paymentData = {
      pf_payment_id: 'pf-abc123',
      amount_gross: '150000',
      amount_fee: '4250',
      amount_net: '145750',
    }

    const result = await handlePaymentFailed(orgId, paymentData)

    expect(result.error).toBeNull()
    expect(result.data?.processed).toBe(true)

    // Verify subscription_history INSERT was called
    expect(mockFrom).toHaveBeenCalledWith('subscription_history')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: orgId,
        transaction_id: 'pf-abc123',
        amount: 150000,
        status: 'failed',
        payment_method: 'payfast',
      })
    )
  })

  it('handlePaymentComplete is NOT exported from subscriptions.ts (deleted)', async () => {
    const subscriptionsModule = await import('@/lib/billing/subscriptions')
    expect((subscriptionsModule as Record<string, unknown>).handlePaymentComplete).toBeUndefined()
  })
})
