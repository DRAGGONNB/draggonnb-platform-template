import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrg } from '@/lib/auth/get-user-org'

const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  intent: z.string().min(1).max(2000),
  channels: z.array(z.enum(['email', 'sms', 'facebook', 'instagram', 'linkedin'])).optional(),
})

export async function POST(request: Request) {
  // Auth
  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = userOrg.organizationId

  // Validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CreateCampaignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { name, intent, channels } = parsed.data

  // Kill switch check (inline — DO NOT import from lib/campaigns/kill-switch.ts; built in Plan 11-11)
  const adminClient = createAdminClient()
  const { data: tenantMod } = await adminClient
    .from('tenant_modules')
    .select('config')
    .eq('organization_id', orgId)
    .eq('module_id', 'campaigns')
    .maybeSingle()
  type CampaignsConfig = { campaigns?: { kill_switch_active?: boolean } }
  const killSwitchActive = !!((tenantMod?.config as CampaignsConfig | null)?.campaigns?.kill_switch_active)
  if (killSwitchActive) {
    return NextResponse.json({ error: 'Campaigns are paused for this account' }, { status: 423 })
  }

  // Insert campaign
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      organization_id: orgId,
      name,
      intent,
      status: 'draft',
      channels: channels ?? [],
      force_review: false,
      created_by: userOrg.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('campaigns POST insert error:', error)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }

  return NextResponse.json({ campaignId: data.id }, { status: 201 })
}

export async function GET(request: Request) {
  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, name, status, channels, scheduled_at, created_at, intent')
    .eq('organization_id', userOrg.organizationId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }

  return NextResponse.json({ campaigns: data ?? [] })
}
