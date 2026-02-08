/** @vitest-environment node */
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-bot-token')
vi.stubEnv('TELEGRAM_CHAT_ID', 'test-chat-id')

const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ ok: true }),
  text: () => Promise.resolve('ok'),
})
vi.stubGlobal('fetch', mockFetch)

import { sendLeadNotification, sendMessage } from '@/lib/telegram/bot'

describe('Telegram Bot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends formatted lead notification with approve/reject buttons', async () => {
    await sendLeadNotification(
      'lead-123',
      {
        business_name: 'Test Corp',
        phone: '+27123456789',
        email: 'test@test.com',
        website: 'https://test.com',
        industry: 'Technology',
        issues: ['Need CRM', 'Email automation'],
      },
      {
        score: { fit: 7, urgency: 8, size: 6, overall: 7.1 },
        qualification_status: 'qualified',
        recommended_tier: 'growth',
        reasoning: 'Good fit for our platform',
      }
    )

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/bot'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Test Corp'),
      })
    )

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.reply_markup.inline_keyboard[0]).toHaveLength(2)
    expect(callBody.reply_markup.inline_keyboard[0][0].callback_data).toBe('approve:lead-123')
    expect(callBody.reply_markup.inline_keyboard[0][1].callback_data).toBe('reject:lead-123')
  })

  it('sends plain text message', async () => {
    await sendMessage('Test notification')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('sendMessage'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})
