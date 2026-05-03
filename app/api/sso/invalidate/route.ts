// app/api/sso/invalidate/route.ts
// SSO-13: federation logout receiver.
// Trophy POSTs a 30s logout JWT here; DraggonnB invalidates the user's local session (best-effort).
// If the cross-product logout fails (network, timeout), Trophy still completes its own logout.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyLogout } from '@/lib/sso/jwt'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const token = body?.token
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing logout token' }, { status: 400 })
  }

  let payload
  try {
    payload = await verifyLogout(token)
  } catch {
    return NextResponse.json({ error: 'Invalid logout token' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Idempotent: if jti already processed, return success
  const { data: existing } = await admin
    .from('sso_bridge_tokens')
    .select('jti, consumed_at')
    .eq('jti', payload.jti)
    .maybeSingle()

  if (existing?.consumed_at) {
    return NextResponse.json({ ok: true, note: 'already_processed' })
  }

  // Record the logout jti as consumed (single-use, idempotent)
  await admin.from('sso_bridge_tokens').insert({
    jti: payload.jti,
    user_id: payload.sub,
    // Logout has no org context — use a sentinel zero-UUID
    origin_org: '00000000-0000-0000-0000-000000000000',
    target_org: '00000000-0000-0000-0000-000000000000',
    product: 'draggonnb',
    expires_at: new Date(Date.now() + 30_000).toISOString(),
    consumed_at: new Date().toISOString(),
  })

  // Best-effort: revoke all of this user's Supabase sessions via admin API
  // supabase.auth.admin.signOut(userId, 'others') invalidates all sessions for this user
  // except the session making the call (which doesn't exist here — service role).
  // Using 'global' scope to revoke all sessions.
  try {
    await admin.auth.admin.signOut(payload.sub, 'global' as 'global')
  } catch {
    // Best-effort; federation logout never blocks on Supabase signOut availability
  }

  return NextResponse.json({ ok: true })
}
