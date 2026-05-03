// app/api/sso/validate/route.ts
// SSO-03: bridge token consumer at DraggonnB destination.
// POST { token } — verifies bridge JWT, checks jti single-use, asserts membership, returns session tokens.
// Called by /sso/consume client page when a Trophy user bridges INTO DraggonnB.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyBridge } from '@/lib/sso/jwt'
import { verifyMembership } from '@/lib/auth/membership-proof'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const token = body?.token
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  // Verify JWT signature + TTL (throws on any failure)
  let payload
  try {
    payload = await verifyBridge(token)
  } catch {
    return NextResponse.json({ error: 'Invalid or expired bridge token' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Replay protection: jti single-use check via sso_bridge_tokens
  const { data: bridgeToken } = await admin
    .from('sso_bridge_tokens')
    .select('consumed_at, expires_at')
    .eq('jti', payload.jti)
    .maybeSingle()

  if (!bridgeToken) {
    return NextResponse.json({ error: 'Bridge token not found' }, { status: 401 })
  }

  if (bridgeToken.consumed_at) {
    // Replay attempt — write audit row and return 401 (must_have: audit row with action='sso_replay_attempt')
    await admin
      .from('audit_log')
      .insert({
        action: 'sso_replay_attempt',
        resource_type: 'sso_bridge_token',
        resource_id: payload.jti,
        actor_id: payload.sub,
        payload: { product: payload.intended_product, target_org: payload.draggonnb_org },
      })
      .then(() => null, () => null) // best-effort; never block the 401 on audit insert failure
    return NextResponse.json({ error: 'Bridge token already consumed' }, { status: 401 })
  }

  if (new Date(bridgeToken.expires_at as string).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Bridge token expired' }, { status: 401 })
  }

  // Atomically mark consumed (prevents race condition replay)
  await admin
    .from('sso_bridge_tokens')
    .update({ consumed_at: new Date().toISOString() })
    .eq('jti', payload.jti)

  // SSO-05: confirm (draggonnb_org, trophy_org) pair has an active link row.
  // A forged bridge token with two valid-but-unlinked org IDs would otherwise pass crypto + replay checks.
  const { data: link } = await admin
    .from('cross_product_org_links')
    .select('id')
    .eq('draggonnb_org_id', payload.draggonnb_org)
    .eq('trophy_org_id', payload.trophy_org)
    .eq('status', 'active')
    .maybeSingle()

  if (!link) {
    await admin
      .from('audit_log')
      .insert({
        action: 'sso_unlinked_pair_attempt',
        resource_type: 'sso_bridge_token',
        resource_id: payload.jti,
        actor_id: payload.sub,
        payload: { draggonnb_org: payload.draggonnb_org, trophy_org: payload.trophy_org },
      })
      .then(() => null, () => null)
    return NextResponse.json(
      { error: 'No active cross-product org link', code: 'UNLINKED_ORG_PAIR' },
      { status: 403 }
    )
  }

  // D2 / SSO-06: user must already have organization_users row in target DraggonnB org (no auto-create)
  const membershipValid = await verifyMembership(payload.sub, payload.draggonnb_org)
  if (!membershipValid) {
    return NextResponse.json(
      { error: 'No active membership in target DraggonnB tenant — invite required', code: 'NO_MEMBERSHIP' },
      { status: 403 }
    )
  }

  // Return session tokens for client-side setSession (Option B from 13-SSO-SPIKE.md Section 6)
  // The access_token issued by DraggonnB is valid on Trophy — both share the same Supabase project.
  return NextResponse.json({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    redirectTo: '/dashboard',
  })
}
