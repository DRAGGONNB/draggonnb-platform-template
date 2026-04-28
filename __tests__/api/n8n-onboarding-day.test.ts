/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — use vi.hoisted() so variables are available when vi.mock is hoisted
// ---------------------------------------------------------------------------

const { mockSendDay1, mockSendDay2, mockSendDay3, mockRecordEmailSent, mockRecordDriftFlag } =
  vi.hoisted(() => ({
    mockSendDay1: vi.fn(),
    mockSendDay2: vi.fn(),
    mockSendDay3: vi.fn(),
    mockRecordEmailSent: vi.fn(),
    mockRecordDriftFlag: vi.fn(),
  }))

vi.mock('@/emails/onboarding-day1', () => ({
  sendOnboardingDay1: mockSendDay1,
}))

vi.mock('@/emails/onboarding-day2', () => ({
  sendOnboardingDay2: mockSendDay2,
}))

vi.mock('@/emails/onboarding-day3', () => ({
  sendOnboardingDay3: mockSendDay3,
}))

vi.mock('@/lib/onboarding/progress', () => ({
  recordEmailSent: mockRecordEmailSent,
  recordDriftFlag: mockRecordDriftFlag,
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { POST } from '@/app/api/n8n/onboarding-day/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_SECRET = 'test-n8n-secret-123'

function makeRequest(body: unknown, secret?: string): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (secret !== undefined) {
    headers['x-n8n-secret'] = secret
  }
  return new Request('http://localhost/api/n8n/onboarding-day', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/n8n/onboarding-day', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.N8N_WEBHOOK_SECRET = VALID_SECRET
    mockRecordEmailSent.mockResolvedValue(undefined)
    mockRecordDriftFlag.mockResolvedValue(undefined)
  })

  it('returns 401 when x-n8n-secret header is missing', async () => {
    const req = makeRequest({ orgId: 'org-123', day: 1 }, undefined)
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('unauthorized')
  })

  it('returns 401 when x-n8n-secret is wrong', async () => {
    const req = makeRequest({ orgId: 'org-123', day: 1 }, 'wrong-secret')
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(401)
  })

  it('returns 401 when N8N_WEBHOOK_SECRET env not set', async () => {
    delete process.env.N8N_WEBHOOK_SECRET
    const req = makeRequest({ orgId: 'org-123', day: 1 }, VALID_SECRET)
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(401)
  })

  it('returns 400 for day=4 (invalid)', async () => {
    const req = makeRequest({ orgId: 'org-123', day: 4 }, VALID_SECRET)
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('invalid_input')
  })

  it('returns 400 for missing orgId', async () => {
    const req = makeRequest({ day: 1 }, VALID_SECRET)
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(400)
  })

  it('day=1 calls sendOnboardingDay1 and stamps day1_email_sent_at', async () => {
    mockSendDay1.mockResolvedValue(null) // null = success
    const req = makeRequest({ orgId: 'org-abc', day: 1 }, VALID_SECRET)
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    expect(mockSendDay1).toHaveBeenCalledWith('org-abc')
    expect(mockRecordEmailSent).toHaveBeenCalledWith('org-abc', 1)
    expect(mockRecordDriftFlag).not.toHaveBeenCalled()
  })

  it('day=2 calls sendOnboardingDay2', async () => {
    mockSendDay2.mockResolvedValue(null)
    const req = makeRequest({ orgId: 'org-abc', day: 2 }, VALID_SECRET)
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    expect(mockSendDay2).toHaveBeenCalledWith('org-abc')
    expect(mockRecordEmailSent).toHaveBeenCalledWith('org-abc', 2)
  })

  it('day=3 calls sendOnboardingDay3', async () => {
    mockSendDay3.mockResolvedValue(null)
    const req = makeRequest({ orgId: 'org-abc', day: 3 }, VALID_SECRET)
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    expect(mockSendDay3).toHaveBeenCalledWith('org-abc')
    expect(mockRecordEmailSent).toHaveBeenCalledWith('org-abc', 3)
  })

  it('returns 500 and records drift flag on send failure', async () => {
    mockSendDay1.mockResolvedValue('Resend API error: domain not verified')
    const req = makeRequest({ orgId: 'org-bad', day: 1 }, VALID_SECRET)
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('send_failed')
    expect(mockRecordDriftFlag).toHaveBeenCalledWith('org-bad', 'day1_email_failed')
    expect(mockRecordEmailSent).not.toHaveBeenCalled()
  })
})
