import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'
import { createAssignmentSchema } from '@/lib/elijah/validations'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const { data, error } = await auth.supabase
      .from('elijah_incident_assignment')
      .select('*, member:elijah_member(id, display_name, phone)')
      .eq('incident_id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
    }

    return NextResponse.json({ assignments: data || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const body = await request.json()
    const parsed = createAssignmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: assigner } = await auth.supabase
      .from('elijah_member')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('organization_id', auth.organizationId)
      .single()

    const { data, error } = await auth.supabase
      .from('elijah_incident_assignment')
      .insert({
        incident_id: id,
        member_id: parsed.data.member_id,
        assigned_by: assigner?.id || null,
      })
      .select('*, member:elijah_member(id, display_name)')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to assign member' }, { status: 500 })
    }

    // Timeline event
    await auth.supabase.from('elijah_incident_timeline_event').insert({
      incident_id: id,
      event_type: 'member_assigned',
      actor_id: assigner?.id || null,
      notes: `Member assigned to incident`,
    })

    return NextResponse.json({ assignment: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
