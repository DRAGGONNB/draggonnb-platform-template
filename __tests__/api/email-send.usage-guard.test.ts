/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UsageCapExceededError } from '@/lib/usage/types'

vi.mock('@/lib/auth/get-user-org', () => ({
  getUserOrg: vi.fn(),
}))

vi.mock('@/lib/usage/guard', () => ({
  guardUsage: vi.fn(),
}))

vi.mock('@/lib/email/resend', () => ({
  isProviderConfigured: vi.fn().mockReturnValue(true),
  isValidEmail: vi.fn().mockReturnValue(true),
  sanitizeEmail: vi.fn((e: string) => e),
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'msg-123' }),
  renderTemplate: vi.fn((html: string) => html),
  addEmailTracking: vi.fn((html: string) => html),
  generateUnsubscribeUrl: vi.fn().mockReturnValue('https://example.com/unsub'),
  generatePreferencesUrl: vi.fn().mockReturnValue('https://example.com/prefs'),
  htmlToPlainText: vi.fn().mockReturnValue('plain text'),
}))

const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null })
const mockEq = vi.fn().mockReturnThis()
const mockIs = vi.fn().mockReturnThis()
const mockIn = vi.fn().mockReturnThis()
const mockSelect = vi.fn().mockReturnThis()
const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnThis(),
  single: mockSingle,
})
const mockUpdate = vi.fn().mockReturnValue({
  eq: mockEq,
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      eq: mockEq,
      is: mockIs,
      in: mockIn,
      single: mockSingle,
    }),
  }),
}))

import { getUserOrg } from '@/lib/auth/get-user-org'
import { guardUsage } from '@/lib/usage/guard'
import { NextRequest } from 'next/server'

describe('POST /api/email/send — guardUsage enforcement (email_sends metric)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(guardUsage).mockResolvedValue(undefined)
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
      new UsageCapExceededError('org-1', 'email_sends', 1000, 1000)
    )

    const { POST } = await import('@/app/api/email/send/route')

    const request = new NextRequest('http://localhost/api/email/send', {
      method: 'POST',
      body: JSON.stringify({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toBe('usage_cap_exceeded')
    expect(body.metric).toBe('email_sends')
    expect(body.used).toBe(1000)
    expect(body.limit).toBe(1000)
  })

  it('calls guardUsage with email_sends metric BEFORE sending', async () => {
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

    const { POST } = await import('@/app/api/email/send/route')

    const request = new NextRequest('http://localhost/api/email/send', {
      method: 'POST',
      body: JSON.stringify({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(request)

    expect(guardUsage).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-2', metric: 'email_sends', qty: 1 })
    )
  })

  it('returns 401 when getUserOrg fails', async () => {
    vi.mocked(getUserOrg).mockResolvedValue({ data: null, error: 'Not authenticated' })

    const { POST } = await import('@/app/api/email/send/route')

    const request = new NextRequest('http://localhost/api/email/send', {
      method: 'POST',
      body: JSON.stringify({ to: 'a@b.com', subject: 'x', html: '<p>y</p>' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })
})
