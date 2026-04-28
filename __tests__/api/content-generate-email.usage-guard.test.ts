/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UsageCapExceededError } from '@/lib/usage/types'

vi.mock('@/lib/auth/get-user-org', () => ({
  getUserOrg: vi.fn(),
}))

vi.mock('@/lib/usage/guard', () => ({
  guardUsage: vi.fn(),
}))

vi.mock('@/lib/content-studio/prompt-builder', () => ({
  buildEmailPrompt: vi.fn().mockReturnValue('test email prompt'),
}))

import { getUserOrg } from '@/lib/auth/get-user-org'
import { guardUsage } from '@/lib/usage/guard'

describe('POST /api/content/generate/email — guardUsage enforcement', () => {
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
      new UsageCapExceededError('org-1', 'ai_generations', 50, 50)
    )

    const { POST } = await import('@/app/api/content/generate/email/route')

    const request = new Request('http://localhost/api/content/generate/email', {
      method: 'POST',
      body: JSON.stringify({
        goal: 'conversion',
        tone: 'professional',
        audience: 'small business owners',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toBe('usage_cap_exceeded')
    expect(body.metric).toBe('ai_generations')
  })

  it('uses ai_generations metric (not email_sends — this route generates copy, does not send)', async () => {
    vi.mocked(getUserOrg).mockResolvedValue({
      data: {
        userId: 'user-2',
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

    const { POST } = await import('@/app/api/content/generate/email/route')

    const request = new Request('http://localhost/api/content/generate/email', {
      method: 'POST',
      body: JSON.stringify({
        goal: 'conversion',
        tone: 'professional',
        audience: 'small business owners',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(request)

    expect(guardUsage).toHaveBeenCalledWith(
      expect.objectContaining({ metric: 'ai_generations' })
    )
  })

  it('returns 401 when getUserOrg fails', async () => {
    vi.mocked(getUserOrg).mockResolvedValue({ data: null, error: 'Not authenticated' })

    const { POST } = await import('@/app/api/content/generate/email/route')

    const request = new Request('http://localhost/api/content/generate/email', {
      method: 'POST',
      body: JSON.stringify({
        goal: 'conversion',
        tone: 'professional',
        audience: 'small business owners',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })
})
