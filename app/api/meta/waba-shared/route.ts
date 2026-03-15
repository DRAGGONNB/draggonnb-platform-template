import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMetaConfig } from '@/lib/meta/config'
import type { TenantMetaConfig } from '@/lib/meta/config'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()

    const { appSecret } = getMetaConfig()
    const signature = request.headers.get('x-hub-signature-256')
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    const expectedSig = 'sha256=' + crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex')

    if (signature !== expectedSig) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)

    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'message_template_status_update' && change.value?.waba_id) {
          await handleWABAShared(change.value)
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('WABA shared webhook error:', error)
    return NextResponse.json({ status: 'ok' })
  }
}

async function handleWABAShared(value: {
  waba_id: string
  phone_number_id?: string
  display_phone_number?: string
  verified_name?: string
  organization_id?: string
}) {
  if (!value.organization_id) {
    console.error('WABA shared event missing organization_id, cannot associate tenant')
    return
  }

  const metaConfig: TenantMetaConfig = {
    waba_id: value.waba_id,
    phone_number_id: value.phone_number_id || '',
    access_token: '',
    token_expires_at: '',
    onboarding_model: 'B',
    display_phone_number: value.display_phone_number,
    verified_name: value.verified_name,
  }

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('tenant_modules')
    .select('id, config')
    .eq('organization_id', value.organization_id)
    .in('module_id', ['whatsapp', 'social'])
    .limit(1)
    .single()

  if (existing) {
    const mergedConfig = { ...(existing.config as Record<string, unknown> || {}), meta: metaConfig }
    await supabase
      .from('tenant_modules')
      .update({ config: mergedConfig })
      .eq('id', existing.id)
  } else {
    await supabase.from('tenant_modules').insert({
      organization_id: value.organization_id,
      module_id: 'whatsapp',
      is_enabled: true,
      config: { meta: metaConfig },
    })
  }
}
