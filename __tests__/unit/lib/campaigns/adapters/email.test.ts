import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the resend module before importing EmailAdapter
vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn(),
}))

// Mock the env module to avoid boot-time validation issues
vi.mock('@/lib/config/env', () => ({
  env: {
    RESEND_API_KEY: 're_test_key',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    ANTHROPIC_API_KEY: 'sk-ant-test',
    PAYFAST_MERCHANT_ID: 'test-merchant',
    PAYFAST_MERCHANT_KEY: 'test-key',
    PAYFAST_MODE: 'sandbox',
  },
}))

import { sendEmail } from '@/lib/email/resend'
import { EmailAdapter } from '@/lib/campaigns/adapters/email'

const mockSendEmail = vi.mocked(sendEmail)

describe('EmailAdapter', () => {
  let adapter: EmailAdapter

  beforeEach(() => {
    adapter = new EmailAdapter()
    vi.clearAllMocks()
  })

  it('enabled() returns false when RESEND_API_KEY unset', () => {
    vi.stubEnv('RESEND_API_KEY', '')
    expect(adapter.enabled()).toBe(false)
    vi.unstubAllEnvs()
  })

  it('enabled() returns true when RESEND_API_KEY is set', () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_12345')
    expect(adapter.enabled()).toBe(true)
    vi.unstubAllEnvs()
  })

  it('send() success path returns providerMessageId from sendEmail mock', async () => {
    mockSendEmail.mockResolvedValueOnce({ success: true, messageId: 'resend-msg-abc123' })

    const result = await adapter.send({
      bodyText: 'Hello there',
      bodyHtml: '<p>Hello there</p>',
      subject: 'Test Campaign',
      recipientRef: 'test@example.com',
      organizationId: 'org-1',
    })

    expect(result.success).toBe(true)
    expect(result.providerMessageId).toBe('resend-msg-abc123')
    expect(mockSendEmail).toHaveBeenCalledOnce()
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: 'Test Campaign',
      })
    )
  })

  it('send() returns error when sendEmail fails', async () => {
    mockSendEmail.mockResolvedValueOnce({ success: false, error: 'API rate limit exceeded' })

    const result = await adapter.send({
      bodyText: 'Hello',
      recipientRef: 'test@example.com',
      organizationId: 'org-1',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('API rate limit exceeded')
    expect(result.errorCode).toBe('SEND_FAILED')
  })

  it('send() returns error when recipientRef is missing', async () => {
    const result = await adapter.send({
      bodyText: 'Hello',
      organizationId: 'org-1',
    })

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('MISSING_RECIPIENT')
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('verify() returns found=true on last_event=delivered', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_12345')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'msg-1', last_event: 'delivered' }),
    }))

    const result = await adapter.verify('msg-1')

    expect(result.found).toBe(true)
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('verify() returns found=false on last_event=bounced', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_12345')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'msg-1', last_event: 'bounced' }),
    }))

    const result = await adapter.verify('msg-1')

    expect(result.found).toBe(false)
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('verify() returns found=false when Resend API returns non-OK', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_12345')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
    }))

    const result = await adapter.verify('nonexistent-id')

    expect(result.found).toBe(false)
    expect(result.error).toBe('Resend API 404')
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })
})
