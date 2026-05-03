// app/api/sso/issue/route.ts
// SSO-02: bridge issuer at DraggonnB origin.
// GET /api/sso/issue?target=trophy redirects user to Trophy with a 60s HS256 bridge JWT in URL fragment.
// Token delivered in URL FRAGMENT (#token=...) never query string — SSO-04 / 13-SSO-SPIKE.md Section 3.
// Referrer-Policy: no-referrer set to prevent destination site learning DraggonnB subdomain.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { issueBridgeToken } from '@/lib/sso/jwt'
import { asDraggonnbOrgId, asTrophyOrgId } from '@draggonnb/federation-shared'
import { getUserOrg } from '@/lib/auth/get-user-org'

const TROPHY_BASE_URL = process.env.TROPHY_BASE_URL ?? 'https://trophyos.co.za'

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get('target')
  if (target !== 'trophy') {
    return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
  }

  // Authenticated user
  const { data: userOrg, error } = await getUserOrg()
  if (error || !userOrg) {
    return NextResponse.redirect(new URL('/login?next=/api/sso/issue?target=trophy', request.url))
  }

  const admin = createAdminClient()

  // Resolve Trophy org from cross_product_org_links (SSO-05)
  const { data: link } = await admin
    .from('cross_product_org_links')
    .select('trophy_org_id')
    .eq('draggonnb_org_id', userOrg.organizationId)
    .eq('status', 'active')
    .maybeSingle()

  if (!link) {
    // No active link — redirect to activate-trophy page (Plan 13-07 will create this)
    return NextResponse.redirect(new URL('/dashboard/activate-trophy', request.url))
  }

  // D2 / SSO-06: verify user has org_members row in Trophy org (per-product membership)
  const { data: trophyMember } = await admin
    .from('org_members')
    .select('id')
    .eq('org_id', link.trophy_org_id)
    .eq('user_id', userOrg.userId)
    .eq('is_active', true)
    .maybeSingle()

  if (!trophyMember) {
    return NextResponse.redirect(
      new URL('/dashboard/activate-trophy?reason=missing_trophy_membership', request.url)
    )
  }

  // Get the user's current Supabase session — access_token + refresh_token bridge into Trophy
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.redirect(new URL('/login?next=/api/sso/issue?target=trophy', request.url))
  }

  const expiresAt = new Date(Date.now() + 60_000).toISOString()

  // Mint 60s HS256 bridge JWT
  const draggonnbOrgId = asDraggonnbOrgId(userOrg.organizationId)
  const trophyOrgId = asTrophyOrgId(link.trophy_org_id)
  const { token, jti } = await issueBridgeToken({
    sub: userOrg.userId,
    draggonnb_org: draggonnbOrgId,
    trophy_org: trophyOrgId,
    // origin_org and target_org mirror draggonnb_org / trophy_org per BridgeTokenPayload shape
    origin_org: draggonnbOrgId,
    target_org: trophyOrgId,
    intended_product: 'trophy',
    product: 'trophy',
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user_email: session.user.email ?? '',
  })

  // Write jti to replay-protection table (service-role only, RLS enforced)
  const { error: insertErr } = await admin.from('sso_bridge_tokens').insert({
    jti,
    user_id: userOrg.userId,
    origin_org: userOrg.organizationId,
    target_org: link.trophy_org_id,
    product: 'trophy',
    expires_at: expiresAt,
  })
  if (insertErr) {
    console.error('sso/issue: failed to record bridge token:', insertErr)
    return NextResponse.json({ error: 'Failed to record bridge token' }, { status: 500 })
  }

  // 302 redirect — token in URL FRAGMENT (never query string; fragments don't appear in server logs)
  const consumeUrl = `${TROPHY_BASE_URL}/sso/consume#token=${encodeURIComponent(token)}`
  const res = NextResponse.redirect(consumeUrl, { status: 302 })
  res.headers.set('Referrer-Policy', 'no-referrer')
  return res
}
