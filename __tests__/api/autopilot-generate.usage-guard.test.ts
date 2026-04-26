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
  updateCalendarGenerated: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/agents/business-autopilot', () => ({
  BusinessAutopilotAgent: vi.fn().mockImplementation(() => ({
    generateCalendar: vi.fn().mockResolvedValue({
      response: 'Generated',
      result: { week: '2026-W17', theme: 'Test', notes: '', entries: [] },
      sessionId: 'sess-456',
      tokensUsed: 200,
    }),
  })),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  })),
}))

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { getUserOrg } from '@/lib/auth/get-user-org'
import { guardUsage } from '@/lib/usage/guard'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/autopilot/generate — guardUsage enforcement', () => {
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

    const { POST } = await import('@/app/api/autopilot/generate/route')

    const { NextRequest } = await import('next/server')
    const request = new NextRequest('http://localhost/api/autopilot/generate', {
      method: 'POST',
      body: JSON.stringify({ week: '2026-W17' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toBe('usage_cap_exceeded')
    expect(body.metric).toBe('agent_invocations')
    expect(body.used).toBe(10)
    expect(body.limit).toBe(10)
  })

  it('calls guardUsage with agent_invocations metric (ERR-035 confirmed N/A: uses getUserOrg not from(users))', async () => {
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

    const { getClientProfile } = await import('@/lib/autopilot/client-profile')
    vi.mocked(getClientProfile).mockResolvedValue(null)

    const { POST } = await import('@/app/api/autopilot/generate/route')

    const { NextRequest } = await import('next/server')
    const request = new NextRequest('http://localhost/api/autopilot/generate', {
      method: 'POST',
      body: JSON.stringify({ week: '2026-W17' }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(request)

    expect(guardUsage).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-2', metric: 'agent_invocations' })
    )
  })

  it('returns 401 when getUserOrg returns no data', async () => {
    vi.mocked(getUserOrg).mockResolvedValue({ data: null, error: 'Not authenticated' })

    const { POST } = await import('@/app/api/autopilot/generate/route')

    const { NextRequest } = await import('next/server')
    const request = new NextRequest('http://localhost/api/autopilot/generate', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })
})
