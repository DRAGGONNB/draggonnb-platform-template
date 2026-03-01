import { sendTextMessage, sendInteractiveMessage } from './client'
import { logUsageSync } from '@/lib/usage/meter'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SendMessageResponse } from './types'

type MessageCategory = 'utility' | 'marketing' | 'service'

interface MeteredSendOptions {
  organizationId: string
  to: string
  category: MessageCategory
  module?: string
}

/**
 * Check if a service window is open for a phone number.
 * Service window = 24h after last inbound message from this number.
 * Within the window, replies are free (no template required).
 */
export async function checkServiceWindow(phoneNumber: string): Promise<{
  isOpen: boolean
  lastInboundAt: string | null
  windowExpiresAt: string | null
  minutesRemaining: number
}> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('whatsapp_inbound_log')
    .select('created_at')
    .eq('phone_number', phoneNumber)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) {
    return { isOpen: false, lastInboundAt: null, windowExpiresAt: null, minutesRemaining: 0 }
  }

  const lastInbound = new Date(data.created_at)
  const windowEnd = new Date(lastInbound.getTime() + 24 * 60 * 60 * 1000)
  const now = new Date()
  const isOpen = now < windowEnd
  const minutesRemaining = isOpen ? Math.floor((windowEnd.getTime() - now.getTime()) / 60000) : 0

  return {
    isOpen,
    lastInboundAt: lastInbound.toISOString(),
    windowExpiresAt: windowEnd.toISOString(),
    minutesRemaining,
  }
}

/**
 * Determine the metering dimension for a WhatsApp message.
 * - Service window replies are free (no metering)
 * - Utility messages (transactional) use whatsapp_utility dimension
 * - Marketing messages use whatsapp_marketing dimension
 */
function getWhatsAppDimension(
  category: MessageCategory,
  serviceWindowOpen: boolean
): string | null {
  if (category === 'service' || (serviceWindowOpen && category === 'utility')) {
    return null // Free - within service window
  }
  if (category === 'utility') return 'whatsapp_utility'
  return 'whatsapp_marketing'
}

/**
 * Send a metered WhatsApp text message.
 * Automatically checks service window and logs correct usage dimension.
 */
export async function sendMeteredTextMessage(
  options: MeteredSendOptions,
  text: string
): Promise<SendMessageResponse> {
  const { organizationId, to, category, module } = options

  const serviceWindow = await checkServiceWindow(to)
  const dimension = getWhatsAppDimension(category, serviceWindow.isOpen)

  // Log usage if not free
  if (dimension) {
    await logUsageSync({
      organizationId,
      dimension: dimension as 'whatsapp_utility' | 'whatsapp_marketing',
      quantity: 1,
      module: module || 'whatsapp',
      metadata: {
        to,
        category,
        service_window_open: serviceWindow.isOpen,
        message_type: 'text',
      },
    })
  }

  return sendTextMessage(to, text)
}

/**
 * Send a metered WhatsApp interactive button message.
 */
export async function sendMeteredInteractiveMessage(
  options: MeteredSendOptions,
  body: string,
  buttons: Array<{ id: string; title: string }>
): Promise<SendMessageResponse> {
  const { organizationId, to, category, module } = options

  const serviceWindow = await checkServiceWindow(to)
  const dimension = getWhatsAppDimension(category, serviceWindow.isOpen)

  if (dimension) {
    await logUsageSync({
      organizationId,
      dimension: dimension as 'whatsapp_utility' | 'whatsapp_marketing',
      quantity: 1,
      module: module || 'whatsapp',
      metadata: {
        to,
        category,
        service_window_open: serviceWindow.isOpen,
        message_type: 'interactive',
        button_count: buttons.length,
      },
    })
  }

  return sendInteractiveMessage(to, body, buttons)
}
