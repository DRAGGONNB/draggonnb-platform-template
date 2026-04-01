import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'
import { updateIncidentSchema } from '@/lib/elijah/validations'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const { data, error } = await auth.supabase
      .from('elijah_incident')
      .select(`
        *,
        reporter:elijah_member!reported_by(id, display_name, phone),
        assignments:elijah_incident_assignment(
          id,
          assigned_at,
          member:elijah_member(id, display_name, phone)
        ),
        timeline:elijah_incident_timeline_event(
          id, event_type, notes, created_at,
          actor:elijah_member(id, display_name)
        ),
        attachments:elijah_incident_attachment(id, file_path, file_type, created_at),
        fire_detail:elijah_fire_incident(*)
      `)
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
    }

    return NextResponse.json({ incident: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const body = await request.json()
    const parsed = updateIncidentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: incident, error } = await auth.supabase
      .from('elijah_incident')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !incident) {
      return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 })
    }

    // Log status change in timeline
    const { data: member } = await auth.supabase
      .from('elijah_member')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('organization_id', auth.organizationId)
      .single()

    if (member && parsed.data.status) {
      await auth.supabase.from('elijah_incident_timeline_event').insert({
        incident_id: id,
        event_type: 'status_changed',
        actor_id: member.id,
        notes: `Status changed to ${parsed.data.status}`,
      })
    }

    return NextResponse.json({ incident })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
