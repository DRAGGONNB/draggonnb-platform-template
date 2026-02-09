import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { testWebhookConnection } from '@/lib/n8n/webhooks'

/**
 * POST /api/webhooks/n8n/test
 * Tests connectivity to N8N webhook endpoints.
 * Requires authentication.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const webhookPath = body.webhook || process.env.N8N_WEBHOOK_CONTENT_GENERATOR || '/webhook/draggonnb-generate-content'

    const isConnected = await testWebhookConnection(webhookPath)

    return NextResponse.json({
      success: true,
      n8n_base_url: process.env.N8N_BASE_URL ? 'configured' : 'missing',
      webhook_path: webhookPath,
      connected: isConnected,
      webhooks: {
        content_generator: process.env.N8N_WEBHOOK_CONTENT_GENERATOR ? 'configured' : 'missing',
        analytics: process.env.N8N_WEBHOOK_ANALYTICS ? 'configured' : 'missing',
        email_content: process.env.N8N_WEBHOOK_EMAIL_CONTENT ? 'configured' : 'missing',
        social_content: process.env.N8N_WEBHOOK_SOCIAL_CONTENT ? 'configured' : 'missing',
      },
    })
  } catch (error) {
    console.error('N8N webhook test error:', error)
    return NextResponse.json(
      { error: 'Failed to test webhook connection' },
      { status: 500 }
    )
  }
}
