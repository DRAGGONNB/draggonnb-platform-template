// Phase 11: POST /api/admin/campaigns/kill-switch — platform_admin only (CAMP-06).
// Activates or deactivates the per-tenant campaign kill switch.
// GET: returns current kill switch status for the admin UI.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { setKillSwitch, getKillSwitchStatus } from '@/lib/campaigns/kill-switch'
import { sendKillSwitchAlert } from '@/lib/campaigns/telegram-alerts'

const KillSwitchSchema = z.object({
  orgId: z.string().uuid({ message: 'orgId must be a valid UUID' }),
  active: z.boolean(),
  reason: z.string().min(1).max(500).default('No reason provided'),
})

/**
 * GET /api/admin/campaigns/kill-switch?orgId=<uuid>
 * Returns the current kill switch status for an org (platform_admin only).
 */
export async function GET(request: Request) {
  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // platform_admin guard (role stored as 'admin' in platform org, or 'platform_admin')
  if (userOrg.role !== 'platform_admin' && userOrg.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — platform_admin only' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('orgId')
  if (!orgId) {
    return NextResponse.json({ error: 'orgId query param is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const status = await getKillSwitchStatus(supabase, orgId)

  return NextResponse.json({ status })
}

/**
 * POST /api/admin/campaigns/kill-switch
 * Body: { orgId: string, active: boolean, reason: string }
 * Activates or deactivates the kill switch. Sends Telegram alert on activation.
 */
export async function POST(request: Request) {
  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // platform_admin guard
  if (userOrg.role !== 'platform_admin' && userOrg.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — platform_admin only' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = KillSwitchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { orgId, active, reason } = parsed.data
  const supabase = createAdminClient()

  // Verify target org exists
  const { data: targetOrg } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', orgId)
    .single()

  if (!targetOrg) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  try {
    const { cancelled } = await setKillSwitch(supabase, orgId, active, reason, userOrg.email)

    if (active) {
      // Send Telegram alert for activation (non-fatal)
      await sendKillSwitchAlert({
        orgName: targetOrg.name,
        orgId,
        adminEmail: userOrg.email,
        reason,
        cancelledCount: cancelled,
      }).catch((err) => console.error('[kill-switch] Telegram alert failed:', err))
    }

    return NextResponse.json({ ok: true, active, cancelled })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[kill-switch] setKillSwitch failed:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
