/**
 * N8N Webhook Integration
 * Handles all communication with N8N workflows
 */

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://n8n.srv1114684.hstgr.cloud'

export interface N8NWebhookResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Generate content using Claude AI via N8N workflow
 */
export async function triggerContentGeneration(payload: {
  organizationId: string
  prompt: string
  platforms: string[]
  contentType: string
  tone?: string
  schedule?: string
}): Promise<N8NWebhookResponse> {
  try {
    const response = await fetch(
      `${N8N_BASE_URL}${process.env.N8N_WEBHOOK_CONTENT_GENERATOR}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      throw new Error(`N8N webhook failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Content generation webhook error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Fetch analytics data via N8N workflow
 */
export async function triggerAnalytics(payload: {
  organizationId: string
  period: 'daily' | 'weekly' | 'monthly'
  startDate?: string
  endDate?: string
}): Promise<N8NWebhookResponse> {
  try {
    const response = await fetch(
      `${N8N_BASE_URL}${process.env.N8N_WEBHOOK_ANALYTICS}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      throw new Error(`N8N webhook failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Analytics webhook error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Test webhook connectivity
 */
export async function testWebhookConnection(webhookUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${N8N_BASE_URL}${webhookUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true }),
    })

    return response.ok
  } catch (error) {
    console.error('Webhook test failed:', error)
    return false
  }
}

/**
 * Trigger client provisioning workflow
 */
export async function triggerClientProvisioning(payload: {
  organizationId: string
  clientName: string
  email: string
  tier: 'starter' | 'professional' | 'enterprise' | 'core' | 'growth' | 'scale'
  features: string[]
}): Promise<N8NWebhookResponse> {
  try {
    const response = await fetch(
      `${N8N_BASE_URL}/webhook/provision-client`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      throw new Error(`N8N webhook failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Client provisioning webhook error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Trigger onboarding email sequence for new client
 */
export async function triggerOnboardingEmail(payload: {
  organizationId: string
  email: string
  clientName: string
  tier: string
  deploymentUrl?: string
}): Promise<N8NWebhookResponse> {
  try {
    const response = await fetch(
      `${N8N_BASE_URL}/webhook/onboarding-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      throw new Error(`N8N webhook failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Onboarding email webhook error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Trigger lead qualification and business analysis
 */
export async function triggerLeadAnalysis(payload: {
  leadId: string
  companyName: string
  website?: string
  email: string
  industry?: string
}): Promise<N8NWebhookResponse> {
  try {
    const response = await fetch(
      `${N8N_BASE_URL}/webhook/analyze-lead`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      throw new Error(`N8N webhook failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Lead analysis webhook error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
