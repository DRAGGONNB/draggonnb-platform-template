import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError, getElijahMember, hasElijahRole, readFarmAccess } from '@/lib/elijah/api-helpers'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    // Check if user has elevated role for access_code
    const member = await getElijahMember(auth.supabase, auth.userId, auth.organizationId)
    const canSeeAccessCode = member
      ? await hasElijahRole(auth.supabase, member.id, ['admin', 'dispatcher', 'fire_coordinator'])
      : false

    if (canSeeAccessCode && member) {
      const ip = request.headers.get('x-forwarded-for') || null
      const { data, error } = await readFarmAccess(id, member.id, ip)
      if (error || !data) {
        return NextResponse.json({ error: 'Farm not found' }, { status: 404 })
      }
      return NextResponse.json({ farm: data })
    }

    // Non-elevated: return without access_code
    const { data, error } = await auth.supabase
      .from('elijah_fire_farm')
      .select('id, organization_id, name, owner_name, owner_phone, location, boundary, access_gate_location, access_notes, created_at, updated_at')
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 })
    }

    return NextResponse.json({ farm: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
