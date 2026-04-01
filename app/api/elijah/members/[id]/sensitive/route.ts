import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError, getElijahMember, hasElijahRole, readSensitiveProfile } from '@/lib/elijah/api-helpers'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth
    const { id: memberId } = await params

    const accessor = await getElijahMember(auth.supabase, auth.userId, auth.organizationId)
    if (!accessor) {
      return NextResponse.json({ error: 'Elijah member not found' }, { status: 403 })
    }

    const authorized = await hasElijahRole(auth.supabase, accessor.id, ['admin', 'dispatcher'])
    if (!authorized) {
      return NextResponse.json({ error: 'Insufficient role for sensitive data access' }, { status: 403 })
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
    const { data, error } = await readSensitiveProfile(memberId, accessor.id, ip)

    if (error || !data) {
      return NextResponse.json({ error: 'Sensitive profile not found' }, { status: 404 })
    }

    return NextResponse.json({ profile: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
