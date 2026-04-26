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
  sendBatchEmails: vi.fn().mockResolvedValue([{ success: true, messageId: 'msg-1' }]),
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
  renderTemplate: vi.fn((html: string) => html),
  addEmailTracking: vi.fn((html: string) => html),
  generateUnsubscribeUrl: vi.fn().mockReturnValue('https://example.com/unsub'),
  generatePreferencesUrl: vi.fn().mockReturnValue('https://example.com/prefs'),
  htmlToPlainText: vi.fn().mockReturnValue('plain text'),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { getUserOrg } from '@/lib/auth/get-user-org'
import { guardUsage } from '@/lib/usage/guard'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function buildChainableMock(overrides: {
  campaign?: object | null
  contacts?: object[] | null
  unsubscribes?: object[] | null
}) {
  const campaign = overrides.campaign ?? {
    id: 'campaign-1',
    status: 'draft',
    subject: 'Test Campaign',
    html_content: '<p>Hello</p>',
    template_id: null,
    email_templates: null,
  }
  const contacts = overrides.contacts ?? [
    { id: 'c-1', email: 'contact@example.com', first_name: 'John', last_name: 'Doe' },
  ]
  const unsubscribes = overrides.unsubscribes ?? []

  let callCount = 0

  const makeChain = (resolveValue: { data: unknown; error: null }) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolveValue),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'send-1' }, error: null }),
    }),
    update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    then: undefined,
  })

  return {
    from: vi.fn((table: string) => {
      if (table === 'email_campaigns') {
        return {
          ...makeChain({ data: campaign, error: null }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: campaign, error: campaign ? null : { message: 'not found' } }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        }
      }
      if (table === 'contacts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: contacts, error: null }),
            }),
          }),
        }
      }
      if (table === 'email_unsubscribes') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({ data: unsubscribes, error: null }),
            }),
          }),
        }
      }
      // Default chain (email_sends inserts, etc.)
      return makeChain({ data: null, error: null })
    }),
  } as any
}

describe('POST /api/email/campaigns/[id]/send — guardUsage enforcement (email_sends metric)', () => {
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

    vi.mocked(createClient).mockResolvedValue(buildChainableMock({}))

    vi.mocked(guardUsage).mockRejectedValue(
      new UsageCapExceededError('org-1', 'email_sends', 1000, 1000)
    )

    const { POST } = await import('@/app/api/email/campaigns/[id]/send/route')

    const request = new NextRequest('http://localhost/api/email/campaigns/campaign-1/send', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'campaign-1' }) })
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toBe('usage_cap_exceeded')
    expect(body.metric).toBe('email_sends')
  })

  it('returns 401 when getUserOrg fails', async () => {
    vi.mocked(getUserOrg).mockResolvedValue({ data: null, error: 'Not authenticated' })

    const { POST } = await import('@/app/api/email/campaigns/[id]/send/route')

    const request = new NextRequest('http://localhost/api/email/campaigns/x/send', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'x' }) })
    expect(response.status).toBe(401)
  })
})
