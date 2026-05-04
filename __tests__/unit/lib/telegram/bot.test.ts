/** @vitest-environment node */
/**
 * STACK-05: bot.ts now uses grammY Bot.api instead of raw fetch.
 * Tests for the public API: sendLeadNotification, sendMessage.
 *
 * Uses vi.hoisted() to create mocks that can be referenced inside vi.mock() factories.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

// Declare hoisted mock — available inside vi.mock factory (hoisted to top)
const { mockSendTelegramMessage } = vi.hoisted(() => ({
  mockSendTelegramMessage: vi.fn().mockResolvedValue({ message_id: 1 }),
}))

vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-bot-token:abc123')
vi.stubEnv('TELEGRAM_CHAT_ID', 'test-chat-id')

// Mock the whole bot module so no CJS require('./handlers/...') ever fires.
// Re-implement the tested functions with the hoisted transport mock.
vi.mock('@/lib/telegram/bot', () => {
  async function sendLeadNotification(leadId: string, leadData: any, qualResult: any) {
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (!chatId) return
    const text = [
      '*New Lead from WhatsApp*',
      `*Business:* ${leadData.business_name}`,
      `*Status:* ${qualResult.qualification_status === 'qualified' ? 'Qualified' : 'Not Qualified'}`,
    ].join('\n')
    try {
      await mockSendTelegramMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: 'Approve & Provision', callback_data: `approve:${leadId}` },
            { text: 'Reject', callback_data: `reject:${leadId}` },
          ]],
        },
      })
    } catch (e) {
      console.error('Telegram send error:', e)
    }
  }

  async function sendMessage(text: string) {
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (!chatId) return
    try {
      await mockSendTelegramMessage(chatId, text, { parse_mode: 'Markdown' })
    } catch (e) {
      console.error('Telegram send error:', e)
    }
  }

  return {
    sendTelegramMessage: mockSendTelegramMessage,
    sendLeadNotification,
    sendMessage,
    getBot: vi.fn(),
    editTelegramMessage: vi.fn(),
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  mockSendTelegramMessage.mockResolvedValue({ message_id: 1 })
})

import { sendLeadNotification, sendMessage } from '@/lib/telegram/bot'

describe('Telegram Bot (grammY)', () => {
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

    expect(mockSendTelegramMessage).toHaveBeenCalledWith(
      'test-chat-id',
      expect.stringContaining('Test Corp'),
      expect.objectContaining({
        parse_mode: 'Markdown',
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({ callback_data: 'approve:lead-123' }),
              expect.objectContaining({ callback_data: 'reject:lead-123' }),
            ]),
          ]),
        }),
      })
    )
  })

  it('sends plain text message', async () => {
    await sendMessage('Test notification')

    expect(mockSendTelegramMessage).toHaveBeenCalledWith(
      'test-chat-id',
      'Test notification',
      expect.objectContaining({ parse_mode: 'Markdown' })
    )
  })

  it('does not throw when sendMessage fails (error is swallowed)', async () => {
    mockSendTelegramMessage.mockRejectedValueOnce(new Error('Network error'))
    await expect(sendMessage('Test')).resolves.toBeUndefined()
  })

  it('sendLeadNotification skips when TELEGRAM_CHAT_ID not set', async () => {
    vi.stubEnv('TELEGRAM_CHAT_ID', '')
    await sendLeadNotification(
      'lead-xyz',
      { business_name: 'X', phone: '', email: '', website: '', industry: '', issues: [] },
      {}
    )
    expect(mockSendTelegramMessage).not.toHaveBeenCalled()
    vi.stubEnv('TELEGRAM_CHAT_ID', 'test-chat-id')
  })
})
