import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SmsAdapter } from '@/lib/campaigns/adapters/sms'

describe('SmsAdapter', () => {
  let adapter: SmsAdapter

  beforeEach(() => {
    adapter = new SmsAdapter()
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('enabled() returns false when token id missing', () => {
    vi.stubEnv('BULKSMS_TOKEN_ID', '')
    vi.stubEnv('BULKSMS_TOKEN_SECRET', 'secret-value')
    expect(adapter.enabled()).toBe(false)
  })

  it('enabled() returns false when token secret missing', () => {
    vi.stubEnv('BULKSMS_TOKEN_ID', 'token-id')
    vi.stubEnv('BULKSMS_TOKEN_SECRET', '')
    expect(adapter.enabled()).toBe(false)
  })

  it('enabled() returns true when both tokens set', () => {
    vi.stubEnv('BULKSMS_TOKEN_ID', 'my-token-id')
    vi.stubEnv('BULKSMS_TOKEN_SECRET', 'my-token-secret')
    expect(adapter.enabled()).toBe(true)
  })

  it('send() returns success + providerMessageId on 201', async () => {
    vi.stubEnv('BULKSMS_TOKEN_ID', 'my-token-id')
    vi.stubEnv('BULKSMS_TOKEN_SECRET', 'my-token-secret')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => [{ id: 'bulksms-msg-xyz', status: { type: 'ACCEPTED' } }],
    }))

    const result = await adapter.send({
      bodyText: 'Your appointment is tomorrow',
      recipientRef: '+27821234567',
      organizationId: 'org-1',
    })

    expect(result.success).toBe(true)
    expect(result.providerMessageId).toBe('bulksms-msg-xyz')
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce()
    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://api.bulksms.com/v1/messages')
    expect(options?.method).toBe('POST')
    expect(options?.headers).toMatchObject({ 'Content-Type': 'application/json' })
    const body = JSON.parse(options?.body as string)
    expect(body.to).toBe('+27821234567')
    expect(body.body).toBe('Your appointment is tomorrow')
  })

  it('send() returns error on 401', async () => {
    vi.stubEnv('BULKSMS_TOKEN_ID', 'bad-token')
    vi.stubEnv('BULKSMS_TOKEN_SECRET', 'bad-secret')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
    }))

    const result = await adapter.send({
      bodyText: 'Test',
      recipientRef: '+27821234567',
      organizationId: 'org-1',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('BulkSMS 401')
    expect(result.errorCode).toBe('SEND_FAILED')
  })

  it('send() returns error when recipientRef is missing', async () => {
    const result = await adapter.send({
      bodyText: 'Test message',
      organizationId: 'org-1',
    })

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('MISSING_RECIPIENT')
  })

  it('verify() returns found=true on status.type=DELIVERED', async () => {
    vi.stubEnv('BULKSMS_TOKEN_ID', 'my-token-id')
    vi.stubEnv('BULKSMS_TOKEN_SECRET', 'my-token-secret')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'msg-1', status: { type: 'DELIVERED' } }),
    }))

    const result = await adapter.verify('msg-1')

    expect(result.found).toBe(true)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      'https://api.bulksms.com/v1/messages/msg-1',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Basic /) }) })
    )
  })

  it('verify() returns found=false on non-DELIVERED status', async () => {
    vi.stubEnv('BULKSMS_TOKEN_ID', 'my-token-id')
    vi.stubEnv('BULKSMS_TOKEN_SECRET', 'my-token-secret')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'msg-1', status: { type: 'SENT' } }),
    }))

    const result = await adapter.verify('msg-1')

    expect(result.found).toBe(false)
  })

  it('verify() returns found=false when API returns non-OK', async () => {
    vi.stubEnv('BULKSMS_TOKEN_ID', 'my-token-id')
    vi.stubEnv('BULKSMS_TOKEN_SECRET', 'my-token-secret')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
    }))

    const result = await adapter.verify('nonexistent-msg')

    expect(result.found).toBe(false)
    expect(result.error).toBe('BulkSMS 404')
  })

  it('send() normalises SA phone number without + prefix', async () => {
    vi.stubEnv('BULKSMS_TOKEN_ID', 'my-token-id')
    vi.stubEnv('BULKSMS_TOKEN_SECRET', 'my-token-secret')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'msg-norm', status: { type: 'ACCEPTED' } }],
    }))

    await adapter.send({
      bodyText: 'Test',
      recipientRef: '0821234567',
      organizationId: 'org-1',
    })

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string)
    // 0821234567 → strip leading 0 → +27821234567
    expect(body.to).toBe('+27821234567')
  })
})
