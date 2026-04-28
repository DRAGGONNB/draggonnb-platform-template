/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUpdate = vi.fn().mockReturnThis()
const mockEq = vi.fn().mockReturnThis()
const mockSelect = vi.fn().mockReturnThis()
const mockSingle = vi.fn()
const mockFrom = vi.fn().mockReturnValue({
  update: mockUpdate,
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
})

mockUpdate.mockReturnValue({ eq: mockEq })
mockSelect.mockReturnValue({ eq: mockEq })
mockEq.mockReturnValue({ eq: mockEq, single: mockSingle })

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { pauseSaga, resumeSaga } from '@/lib/provisioning/saga-state'
import { rollback } from '@/scripts/provisioning/rollback'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('pauseSaga', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset chain: update().eq() returns { eq }
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    mockFetch.mockResolvedValue({ ok: true })
  })

  it('updates provisioning_jobs with status=paused and correct fields', async () => {
    const mockEqFn = vi.fn().mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockEqFn })

    await pauseSaga('job-123', 5, 'N8N timeout', { organizationId: 'org-abc' })

    expect(mockFrom).toHaveBeenCalledWith('provisioning_jobs')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'paused',
        current_step: 5,
        error_message: 'N8N timeout',
        created_resources: { organizationId: 'org-abc' },
      })
    )
    expect(mockEqFn).toHaveBeenCalledWith('id', 'job-123')
  })

  it('calls Telegram fetch with TELEGRAM_BOT_TOKEN and TELEGRAM_OPS_CHAT_ID', async () => {
    const mockEqFn = vi.fn().mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockEqFn })

    process.env.TELEGRAM_BOT_TOKEN = 'bot-token-xyz'
    process.env.TELEGRAM_OPS_CHAT_ID = 'chat-999'

    await pauseSaga('job-123', 5, 'Step error', {})

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.telegram.org/botbot-token-xyz/sendMessage',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('chat-999'),
      })
    )

    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_OPS_CHAT_ID
  })

  it('succeeds even when Telegram fetch throws (alert is non-blocking)', async () => {
    const mockEqFn = vi.fn().mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockEqFn })

    process.env.TELEGRAM_BOT_TOKEN = 'bot-token-xyz'
    process.env.TELEGRAM_OPS_CHAT_ID = 'chat-999'
    mockFetch.mockRejectedValue(new Error('Telegram network error'))

    // Should NOT throw
    await expect(pauseSaga('job-123', 5, 'Step error', {})).resolves.toBeUndefined()

    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_OPS_CHAT_ID
  })

  it('does NOT call fetch when Telegram env vars are absent', async () => {
    const mockEqFn = vi.fn().mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockEqFn })
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_OPS_CHAT_ID

    await pauseSaga('job-123', 5, 'Step error', {})

    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('resumeSaga', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws if job status is not paused', async () => {
    const mockSingleFn = vi.fn().mockResolvedValue({
      data: { id: 'job-123', status: 'running', current_step: 3, organization_id: 'org-abc' },
      error: null,
    })
    const mockEqFn = vi.fn().mockReturnValue({ single: mockSingleFn })
    const mockSelectFn = vi.fn().mockReturnValue({ eq: mockEqFn })
    mockFrom.mockReturnValue({ select: mockSelectFn, update: mockUpdate })

    await expect(resumeSaga('job-123')).rejects.toThrow('not paused')
  })

  it('throws if job is not found', async () => {
    const mockSingleFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })
    const mockEqFn = vi.fn().mockReturnValue({ single: mockSingleFn })
    const mockSelectFn = vi.fn().mockReturnValue({ eq: mockEqFn })
    mockFrom.mockReturnValue({ select: mockSelectFn, update: mockUpdate })

    await expect(resumeSaga('job-missing')).rejects.toThrow('not found')
  })
})

describe('rollback()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true })
  })

  it('calls pauseSaga (no DELETE statements)', async () => {
    const mockEqFn = vi.fn().mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockEqFn })
    delete process.env.TELEGRAM_BOT_TOKEN

    await rollback('job-rollback', 7, new Error('step 7 broke'), { organizationId: 'org-x' })

    // Verify it updated provisioning_jobs (via pauseSaga), not deleted
    expect(mockFrom).toHaveBeenCalledWith('provisioning_jobs')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'paused' })
    )
  })

  it('does NOT call any .delete() method', async () => {
    const mockDeleteFn = vi.fn()
    const mockEqFn = vi.fn().mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockEqFn })
    // Inject a delete mock we can spy on
    mockFrom.mockReturnValue({
      update: mockUpdate,
      delete: mockDeleteFn,
      select: vi.fn().mockReturnValue({ eq: vi.fn() }),
    })
    delete process.env.TELEGRAM_BOT_TOKEN

    await rollback('job-rollback', 7, new Error('step 7 broke'), {})

    expect(mockDeleteFn).not.toHaveBeenCalled()
  })
})
