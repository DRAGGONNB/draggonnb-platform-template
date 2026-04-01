import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'
import { patrolCheckinSchema } from '@/lib/elijah/validations'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const body = await request.json()
    const parsed = patrolCheckinSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: member } = await auth.supabase
      .from('elijah_member')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('organization_id', auth.organizationId)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Elijah member not found' }, { status: 400 })
    }

    const insertData: Record<string, unknown> = {
      patrol_id: id,
      member_id: member.id,
      checkin_type: parsed.data.checkin_type,
    }

    if (parsed.data.location) {
      insertData.location = `SRID=4326;POINT(${parsed.data.location.lng} ${parsed.data.location.lat})`
    }

    const { data, error } = await auth.supabase
      .from('elijah_patrol_checkin')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to check in' }, { status: 500 })
    }

    // Update patrol status based on checkin type
    if (parsed.data.checkin_type === 'in') {
      await auth.supabase
        .from('elijah_patrol')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', id)
    } else if (parsed.data.checkin_type === 'out') {
      // Check if all assigned members have checked out
      const { data: assignments } = await auth.supabase
        .from('elijah_patrol_assignment')
        .select('member_id')
        .eq('patrol_id', id)

      const { data: checkouts } = await auth.supabase
        .from('elijah_patrol_checkin')
        .select('member_id')
        .eq('patrol_id', id)
        .eq('checkin_type', 'out')

      const assignedIds = new Set((assignments || []).map(a => a.member_id))
      const checkedOutIds = new Set((checkouts || []).map(c => c.member_id))

      const allOut = [...assignedIds].every(id => checkedOutIds.has(id))
      if (allOut) {
        await auth.supabase
          .from('elijah_patrol')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', id)
      }
    }

    return NextResponse.json({ checkin: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
