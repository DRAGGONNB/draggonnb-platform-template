const TELEGRAM_API_BASE = 'https://api.telegram.org'

function getConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!botToken || !chatId) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID')
  }
  return { botToken, chatId }
}

interface LeadData {
  business_name: string
  phone: string
  email: string
  website: string
  industry: string
  issues: string[]
}

export async function sendLeadNotification(
  leadId: string,
  leadData: LeadData,
  qualResult: Record<string, unknown>
): Promise<void> {
  const { botToken, chatId } = getConfig()

  const score = qualResult?.score as Record<string, number> | undefined
  const status = qualResult?.qualification_status as string || 'unknown'
  const tier = qualResult?.recommended_tier as string || 'unknown'
  const reasoning = qualResult?.reasoning as string || 'No reasoning available'

  const text = [
    '*New Lead from WhatsApp*',
    '',
    `*Business:* ${escapeMarkdown(leadData.business_name)}`,
    `*Phone:* ${escapeMarkdown(leadData.phone)}`,
    `*Email:* ${escapeMarkdown(leadData.email)}`,
    `*Website:* ${escapeMarkdown(leadData.website || 'N/A')}`,
    `*Industry:* ${escapeMarkdown(leadData.industry)}`,
    '',
    `*Issues:*`,
    ...leadData.issues.map((i) => `  - ${escapeMarkdown(i)}`),
    '',
    '*Qualification Result*',
    `*Status:* ${status === 'qualified' ? 'Qualified' : 'Not Qualified'}`,
    `*Fit:* ${score?.fit || 0}/10  *Urgency:* ${score?.urgency || 0}/10  *Size:* ${score?.size || 0}/10`,
    `*Overall:* ${score?.overall || 0}/10`,
    `*Recommended Tier:* ${tier}`,
    '',
    `*Reasoning:* ${escapeMarkdown(reasoning.slice(0, 300))}`,
  ].join('\n')

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: 'Approve & Provision', callback_data: `approve:${leadId}` },
          { text: 'Reject', callback_data: `reject:${leadId}` },
        ]],
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('Telegram send error:', err)
  }
}

export async function sendMessage(text: string): Promise<void> {
  const { botToken, chatId } = getConfig()
  await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  })
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1')
}
