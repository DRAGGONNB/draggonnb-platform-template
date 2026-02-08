import type { SendMessageResponse } from './types'

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v19.0'

function getConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!accessToken || !phoneNumberId) {
    throw new Error('Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID')
  }
  return { accessToken, phoneNumberId }
}

export async function sendTextMessage(to: string, text: string): Promise<SendMessageResponse> {
  const { accessToken, phoneNumberId } = getConfig()
  const response = await fetch(`${WHATSAPP_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`WhatsApp API error: ${response.status} - ${err}`)
  }
  return response.json()
}

export async function sendInteractiveMessage(
  to: string,
  body: string,
  buttons: Array<{ id: string; title: string }>
): Promise<SendMessageResponse> {
  const { accessToken, phoneNumberId } = getConfig()
  const response = await fetch(`${WHATSAPP_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: buttons.map((btn) => ({
            type: 'reply',
            reply: { id: btn.id, title: btn.title },
          })),
        },
      },
    }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`WhatsApp API error: ${response.status} - ${err}`)
  }
  return response.json()
}
