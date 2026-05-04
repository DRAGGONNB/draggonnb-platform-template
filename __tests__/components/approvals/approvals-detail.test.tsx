/** @vitest-environment node */
/**
 * Approvals API route tests — approve + reject endpoints.
 *
 * Tests the HTTP-layer behaviour of:
 *   - POST /api/approvals/[id]/approve
 *   - POST /api/approvals/[id]/reject
 *
 * Checks:
 *   1. approve route returns 401 when unauthenticated
 *   2. approve route returns 403 when role is 'user' (not admin/manager)
 *   3. approve route returns 200 when admin calls and spine succeeds
 *   4. approve route returns 403 when spine throws 'no permission'
 *   5. reject route returns 400 when reason_code missing
 *   6. reject route returns 200 when valid reason_code provided by manager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockGetUserOrg: ReturnType<typeof vi.fn>
let mockApproveRequest: ReturnType<typeof vi.fn>
let mockRejectRequest: ReturnType<typeof vi.fn>

vi.mock('@/lib/auth/get-user-org', () => ({
  getUserOrg: (...a: any[]) => mockGetUserOrg(...a),
}))

vi.mock('@/lib/approvals/spine', () => ({
  approveRequest: (...a: any[]) => mockApproveRequest(...a),
  rejectRequest: (...a: any[]) => mockRejectRequest(...a),
}))

// ── Approve route ─────────────────────────────────────────────────────────────

import { POST as approvePost } from '@/app/api/approvals/[id]/approve/route'
import { POST as rejectPost } from '@/app/api/approvals/[id]/reject/route'

const APPROVAL_ID = 'approval-test-uuid'
const PARAMS = { params: { id: APPROVAL_ID } }

function makeRequest(method = 'POST', body?: any): NextRequest {
  const url = `http://localhost/api/approvals/${APPROVAL_ID}/approve`
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('POST /api/approvals/[id]/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when getUserOrg fails (not authenticated)', async () => {
    mockGetUserOrg = vi.fn().mockResolvedValue({ data: null, error: 'Not authenticated' })
    const res = await approvePost(makeRequest(), PARAMS as any)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('auth required')
  })

  it('returns 403 when user role is "user" (not admin or manager)', async () => {
    mockGetUserOrg = vi.fn().mockResolvedValue({
      data: { userId: 'u1', organizationId: 'org1', role: 'user' },
      error: null,
    })
    const res = await approvePost(makeRequest(), PARAMS as any)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('no permission')
  })

  it('returns 200 with result when admin approves successfully', async () => {
    mockGetUserOrg = vi.fn().mockResolvedValue({
      data: { userId: 'u1', organizationId: 'org1', role: 'admin' },
      error: null,
    })
    mockApproveRequest = vi.fn().mockResolvedValue({ result: 'ok' })

    const res = await approvePost(makeRequest(), PARAMS as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.result).toBe('ok')
    expect(mockApproveRequest).toHaveBeenCalledWith(APPROVAL_ID, 'u1')
  })

  it('returns 403 when spine throws "no permission for this product"', async () => {
    mockGetUserOrg = vi.fn().mockResolvedValue({
      data: { userId: 'u1', organizationId: 'org1', role: 'manager' },
      error: null,
    })
    mockApproveRequest = vi.fn().mockRejectedValue(new Error('no permission for this product'))

    const res = await approvePost(makeRequest(), PARAMS as any)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toContain('no permission')
  })
})

describe('POST /api/approvals/[id]/reject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when reason_code is missing from JSON body', async () => {
    mockGetUserOrg = vi.fn().mockResolvedValue({
      data: { userId: 'u1', organizationId: 'org1', role: 'admin' },
      error: null,
    })
    const url = `http://localhost/api/approvals/${APPROVAL_ID}/reject`
    const req = new NextRequest(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),  // no reason_code
    })
    const res = await rejectPost(req, { params: { id: APPROVAL_ID } } as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('reason_code required')
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUserOrg = vi.fn().mockResolvedValue({ data: null, error: 'Not authenticated' })
    const url = `http://localhost/api/approvals/${APPROVAL_ID}/reject`
    const req = new NextRequest(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason_code: 'wrong_amount' }),
    })
    const res = await rejectPost(req, { params: { id: APPROVAL_ID } } as any)
    expect(res.status).toBe(401)
  })

  it('returns 200 when manager rejects with valid reason_code', async () => {
    mockGetUserOrg = vi.fn().mockResolvedValue({
      data: { userId: 'u1', organizationId: 'org1', role: 'manager' },
      error: null,
    })
    mockRejectRequest = vi.fn().mockResolvedValue({ result: 'ok' })

    const url = `http://localhost/api/approvals/${APPROVAL_ID}/reject`
    const req = new NextRequest(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason_code: 'wrong_amount', reason_text: 'Amount is incorrect' }),
    })
    const res = await rejectPost(req, { params: { id: APPROVAL_ID } } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.result).toBe('ok')
    expect(mockRejectRequest).toHaveBeenCalledWith(
      APPROVAL_ID,
      'u1',
      'wrong_amount',
      'Amount is incorrect'
    )
  })
})
