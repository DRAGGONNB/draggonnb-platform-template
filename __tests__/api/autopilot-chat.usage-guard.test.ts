/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UsageCapExceededError } from '@/lib/usage/types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth/get-user-org', () => ({
  getUserOrg: vi.fn(),
}))

vi.mock('@/lib/usage/guard', () => ({
  guardUsage: vi.fn(),
}))

vi.mock('@/lib/autopilot/client-profile', () => ({
  getClientProfile: vi.fn(),
}))

vi.mock('@/lib/agents/business-autopilot', () => ({
  BusinessAutopilotAgent: vi.fn().mockImplementation(() => ({
    chat: vi.fn().mockResolvedValue({
      response: 'Test response',
      result: null,
      sessionId: 'sess-123',
      tokensUsed: 100,
    }),
  })),
}))

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { getUserOrg } from '@/lib/auth/get-user-org'
import { guardUsage } from '@/lib/usage/guard'
import { getClientProfile } from '@/lib/autopilot/client-profile'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/autopilot/chat — guardUsage enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 429 with cap fields when guardUsage throws UsageCapExceededError', async () => {
    vi.mocked(getUserOrg).mockResolvedValue({
      data: {
        userId: 'user-1',
        email: 'test@example.com',
        fullName: 'Test User',
        organizationId: 'org-1',
        role: 'admin',
        organization: {
          id: 'org-1',
          name: 'Test Org',
          subscription_tier: 'core',
          subscription_status: 'active',
        },
      },
      error: null,
    })

    vi.mocked(guardUsage).mockRejectedValue(
      new UsageCapExceededError('org-1', 'agent_invocations', 10, 10)
    )

    const { POST } = await import('@/app/api/autopilot/chat/route')

    const request = new Request('http://localhost/api/autopilot/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'hello' }),
      headers: { 'Content-Type': 'application/json' },
    })

    // NextRequest wrapping
    const { NextRequest } = await import('next/server')
    const nextReq = new NextRequest(request)

    const response = await POST(nextReq)
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toBe('usage_cap_exceeded')
    expect(body.metric).toBe('agent_invocations')
    expect(body.used).toBe(10)
    expect(body.limit).toBe(10)
  })

  it('calls guardUsage with agent_invocations metric', async () => {
    vi.mocked(getUserOrg).mockResolvedValue({
      data: {
        userId: 'user-1',
        email: 'test@example.com',
        fullName: 'Test User',
        organizationId: 'org-2',
        role: 'admin',
        organization: {
          id: 'org-2',
          name: 'Test Org',
          subscription_tier: 'growth',
          subscription_status: 'active',
        },
      },
      error: null,
    })

    vi.mocked(guardUsage).mockResolvedValue(undefined)
    vi.mocked(getClientProfile).mockResolvedValue(null)

    const { POST } = await import('@/app/api/autopilot/chat/route')

    const { NextRequest } = await import('next/server')
    const request = new NextRequest('http://localhost/api/autopilot/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'hello' }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(request)

    expect(guardUsage).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-2', metric: 'agent_invocations' })
    )
  })

  it('returns 401 when getUserOrg returns no data', async () => {
    vi.mocked(getUserOrg).mockResolvedValue({ data: null, error: 'Not authenticated' })

    const { POST } = await import('@/app/api/autopilot/chat/route')

    const { NextRequest } = await import('next/server')
    const request = new NextRequest('http://localhost/api/autopilot/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'hello' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })
})
