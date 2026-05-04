/** @vitest-environment node */
/**
 * approveRequest() and rejectRequest() unit tests.
 *
 * Checks:
 *   1. approveRequest throws 'approval not found' when row missing
 *   2. approveRequest throws 'no permission for this product' when verifyProductPermission fails
 *   3. approveRequest calls approve_request_atomic RPC with correct args on success
 *   4. rejectRequest passes reason_code + reason_text to RPC
 *   5. rejectRequest throws when approval not found
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mutable supabase mock ────────────────────────────────────────────────────
let mockRpc: ReturnType<typeof vi.fn>
let mockFromImpl: ReturnType<typeof vi.fn>

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (...a: any[]) => mockFromImpl(...a),
    rpc: (...a: any[]) => mockRpc(...a),
  }),
}))

vi.mock('@/lib/telegram/bot', () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue(undefined),
}))

import { approveRequest, rejectRequest } from '@/lib/approvals/spine'

const APPROVAL_ID = 'approval-uuid-001'
const APPROVER_ID = 'user-uuid-approver'
const ORG_ID = 'org-uuid-001'

function makeFromChain(overrides: Record<string, { data: any; error?: any }>) {
  return vi.fn((table: string) => {
    const obj: any = {}
    for (const m of ['select', 'eq', 'in', 'ilike', 'not', 'limit', 'order', 'gte', 'contains']) {
      obj[m] = vi.fn().mockReturnValue(obj)
    }
    const result = overrides[table] ?? { data: null, error: null }
    obj.single = vi.fn().mockResolvedValue(result)
    obj.maybeSingle = vi.fn().mockResolvedValue(result)
    return obj
  })
}

describe('approveRequest()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc = vi.fn().mockResolvedValue({ data: { result: 'ok' }, error: null })
  })

  it('throws "approval not found" when approval_requests row missing', async () => {
    mockFromImpl = makeFromChain({
      approval_requests: { data: null, error: null },
    })

    await expect(approveRequest(APPROVAL_ID, APPROVER_ID)).rejects.toThrow('approval not found')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('throws "no permission for this product" when user is not admin/manager in org', async () => {
    mockFromImpl = makeFromChain({
      approval_requests: { data: { product: 'draggonnb', target_org_id: ORG_ID }, error: null },
      // verifyProductPermission → organization_users maybySingle → null (not admin)
      organization_users: { data: null, error: null },
    })

    await expect(approveRequest(APPROVAL_ID, APPROVER_ID)).rejects.toThrow('no permission for this product')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('calls approve_request_atomic with decision=approved when user has permission', async () => {
    mockFromImpl = makeFromChain({
      approval_requests: { data: { product: 'draggonnb', target_org_id: ORG_ID }, error: null },
      organization_users: { data: { role: 'admin' }, error: null },
    })

    const result = await approveRequest(APPROVAL_ID, APPROVER_ID)

    expect(mockRpc).toHaveBeenCalledWith('approve_request_atomic', {
      p_approval_id: APPROVAL_ID,
      p_approver_user_id: APPROVER_ID,
      p_decision: 'approved',
    })
    expect(result).toEqual({ result: 'ok' })
  })

  it('propagates RPC error from approve_request_atomic', async () => {
    mockFromImpl = makeFromChain({
      approval_requests: { data: { product: 'draggonnb', target_org_id: ORG_ID }, error: null },
      organization_users: { data: { role: 'admin' }, error: null },
    })
    mockRpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'lock timeout' } })

    await expect(approveRequest(APPROVAL_ID, APPROVER_ID)).rejects.toMatchObject({
      message: 'lock timeout',
    })
  })
})

describe('rejectRequest()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc = vi.fn().mockResolvedValue({ data: { result: 'ok' }, error: null })
  })

  it('throws "approval not found" when approval_requests row missing', async () => {
    mockFromImpl = makeFromChain({
      approval_requests: { data: null, error: null },
    })

    await expect(rejectRequest(APPROVAL_ID, APPROVER_ID, 'wrong_amount')).rejects.toThrow(
      'approval not found'
    )
  })

  it('calls approve_request_atomic with decision=rejected + reason_code + reason_text', async () => {
    mockFromImpl = makeFromChain({
      approval_requests: { data: { product: 'draggonnb', target_org_id: ORG_ID }, error: null },
      organization_users: { data: { role: 'manager' }, error: null },
    })

    const result = await rejectRequest(
      APPROVAL_ID,
      APPROVER_ID,
      'not_chargeable',
      'Damage pre-existed check-in'
    )

    expect(mockRpc).toHaveBeenCalledWith('approve_request_atomic', {
      p_approval_id: APPROVAL_ID,
      p_approver_user_id: APPROVER_ID,
      p_decision: 'rejected',
      p_rejection_reason_code: 'not_chargeable',
      p_rejection_reason_text: 'Damage pre-existed check-in',
    })
    expect(result).toEqual({ result: 'ok' })
  })

  it('passes null for reason_text when not provided', async () => {
    mockFromImpl = makeFromChain({
      approval_requests: { data: { product: 'draggonnb', target_org_id: ORG_ID }, error: null },
      organization_users: { data: { role: 'admin' }, error: null },
    })

    await rejectRequest(APPROVAL_ID, APPROVER_ID, 'need_more_info')

    expect(mockRpc).toHaveBeenCalledWith(
      'approve_request_atomic',
      expect.objectContaining({ p_rejection_reason_text: null })
    )
  })
})
