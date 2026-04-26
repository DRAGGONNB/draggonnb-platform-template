/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before any imports
vi.mock('@/lib/config/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    ANTHROPIC_API_KEY: 'test-anthropic-key',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
}))

vi.mock('@/lib/auth/get-user-org', () => ({
  getUserOrg: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

// Mock brand voice lib to avoid env singleton issues
vi.mock('@/lib/brand-voice/pii-scrubber', () => ({
  scrubPII: vi.fn((text: string) => text),
}))

vi.mock('@/lib/brand-voice/pad-to-cache', () => ({
  padToCacheFloor: vi.fn((text: string) => text + ' [PADDED]'),
}))

vi.mock('@/lib/brand-voice/assemble-prompt', () => ({
  assembleBrandVoicePrompt: vi.fn(() => 'assembled brand voice doc'),
}))

import { getUserOrg } from '@/lib/auth/get-user-org'
import { createAdminClient } from '@/lib/supabase/admin'

const MOCK_USER_ORG = {
  userId: 'user-1',
  email: 'test@example.com',
  fullName: 'Test User',
  organizationId: 'org-uuid-1',
  role: 'admin',
  organization: {
    id: 'org-uuid-1',
    name: 'Test Business',
    subscription_tier: 'core',
    subscription_status: 'active',
  },
}

const VALID_BODY = {
  tone: ['Professional', 'Bold'],
  audience: 'South African SME owners who want to grow their business with AI automation tools.',
  differentiator: 'We combine local expertise with AI-powered automation at a fraction of the cost of a full marketing team.',
  example_phrases: ['Built for South African business', 'Simple, powerful, local'],
  forbidden_topics: ['cheap', 'basic'],
}

function buildUpsertMock(error: null | { message: string } = null) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'client_profiles') {
        return {
          upsert: vi.fn().mockResolvedValue({ error }),
        }
      }
      return {}
    }),
  }
}

describe('POST /api/brand-voice/save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUserOrg).mockResolvedValueOnce({ data: null, error: 'unauthenticated' })

    const { POST } = await import('@/app/api/brand-voice/save/route')
    const req = new Request('http://localhost/api/brand-voice/save', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid input (audience too short)', async () => {
    vi.mocked(getUserOrg).mockResolvedValueOnce({ data: MOCK_USER_ORG, error: null })

    const { POST } = await import('@/app/api/brand-voice/save/route')
    const req = new Request('http://localhost/api/brand-voice/save', {
      method: 'POST',
      body: JSON.stringify({ ...VALID_BODY, audience: 'Too short' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_input')
    expect(body.issues).toBeDefined()
  })

  it('returns 400 for missing required fields', async () => {
    vi.mocked(getUserOrg).mockResolvedValueOnce({ data: MOCK_USER_ORG, error: null })

    const { POST } = await import('@/app/api/brand-voice/save/route')
    const req = new Request('http://localhost/api/brand-voice/save', {
      method: 'POST',
      body: JSON.stringify({ tone: [] }), // missing required fields
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it('returns 200 and calls upsert on valid input', async () => {
    vi.mocked(getUserOrg).mockResolvedValueOnce({ data: MOCK_USER_ORG, error: null })
    vi.mocked(createAdminClient).mockReturnValue(buildUpsertMock() as any)

    const { POST } = await import('@/app/api/brand-voice/save/route')
    const req = new Request('http://localhost/api/brand-voice/save', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.updated_at).toBeDefined()
  })

  it('returns 500 when upsert fails', async () => {
    vi.mocked(getUserOrg).mockResolvedValueOnce({ data: MOCK_USER_ORG, error: null })
    vi.mocked(createAdminClient).mockReturnValue(
      buildUpsertMock({ message: 'DB error' }) as any
    )

    const { POST } = await import('@/app/api/brand-voice/save/route')
    const req = new Request('http://localhost/api/brand-voice/save', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('save_failed')
  })
})
