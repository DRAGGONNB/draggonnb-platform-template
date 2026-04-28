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

vi.mock('@/lib/brand-voice/scraper', () => ({
  scrapeWebsiteContext: vi.fn(),
}))

import { getUserOrg } from '@/lib/auth/get-user-org'
import { scrapeWebsiteContext } from '@/lib/brand-voice/scraper'

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

const MOCK_SCRAPED = {
  title: 'Test Business — Home',
  description: 'We help South African SMEs grow.',
  h1: 'Grow your business with AI',
  aboutText: null,
  logoAlt: 'Test Business logo',
}

describe('POST /api/brand-voice/scrape', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUserOrg).mockResolvedValueOnce({ data: null, error: 'unauthenticated' })

    const { POST } = await import('@/app/api/brand-voice/scrape/route')
    const req = new Request('http://localhost/api/brand-voice/scrape', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid/missing URL', async () => {
    vi.mocked(getUserOrg).mockResolvedValueOnce({ data: MOCK_USER_ORG, error: null })

    const { POST } = await import('@/app/api/brand-voice/scrape/route')
    const req = new Request('http://localhost/api/brand-voice/scrape', {
      method: 'POST',
      body: JSON.stringify({ url: 'not-a-url' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 (private_url_not_allowed) for localhost', async () => {
    vi.mocked(getUserOrg).mockResolvedValueOnce({ data: MOCK_USER_ORG, error: null })

    const { POST } = await import('@/app/api/brand-voice/scrape/route')
    const req = new Request('http://localhost/api/brand-voice/scrape', {
      method: 'POST',
      body: JSON.stringify({ url: 'http://localhost:3000/internal' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('private_url_not_allowed')
  })

  it('returns 400 for 127.0.0.1', async () => {
    vi.mocked(getUserOrg).mockResolvedValueOnce({ data: MOCK_USER_ORG, error: null })

    const { POST } = await import('@/app/api/brand-voice/scrape/route')
    const req = new Request('http://localhost/api/brand-voice/scrape', {
      method: 'POST',
      body: JSON.stringify({ url: 'http://127.0.0.1/admin' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('private_url_not_allowed')
  })

  it('returns 400 for private IP range 10.x.x.x', async () => {
    vi.mocked(getUserOrg).mockResolvedValueOnce({ data: MOCK_USER_ORG, error: null })

    const { POST } = await import('@/app/api/brand-voice/scrape/route')
    const req = new Request('http://localhost/api/brand-voice/scrape', {
      method: 'POST',
      body: JSON.stringify({ url: 'http://10.0.0.1/secret' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('private_url_not_allowed')
  })

  it('returns 200 with scraped data for public URL', async () => {
    vi.mocked(getUserOrg).mockResolvedValueOnce({ data: MOCK_USER_ORG, error: null })
    vi.mocked(scrapeWebsiteContext).mockResolvedValueOnce(MOCK_SCRAPED)

    const { POST } = await import('@/app/api/brand-voice/scrape/route')
    const req = new Request('http://localhost/api/brand-voice/scrape', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.title).toBe('Test Business — Home')
    expect(body.description).toBe('We help South African SMEs grow.')
  })

  it('returns 502 when scraper throws', async () => {
    vi.mocked(getUserOrg).mockResolvedValueOnce({ data: MOCK_USER_ORG, error: null })
    vi.mocked(scrapeWebsiteContext).mockRejectedValueOnce(new Error('Connection refused'))

    const { POST } = await import('@/app/api/brand-voice/scrape/route')
    const req = new Request('http://localhost/api/brand-voice/scrape', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toBe('scrape_failed')
    expect(body.detail).toBe('Connection refused')
  })
})
