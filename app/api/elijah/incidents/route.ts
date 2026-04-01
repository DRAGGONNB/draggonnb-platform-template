import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'
import { createIncidentSchema } from '@/lib/elijah/validations'

export async function GET(request: Request) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const severity = searchParams.get('severity')

    let query = auth.supabase
      .from('elijah_incident')
      .select(`
        *,
        reporter:elijah_member!reported_by(id, display_name),
        assignments:elijah_incident_assignment(
          member:elijah_member(id, display_name)
        )
      `, { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (type) query = query.eq('type', type)
    if (severity) query = query.eq('severity', severity)

    const { data, error, count } = await query.limit(50)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 })
    }

    return NextResponse.json({ incidents: data || [], total: count || 0 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createIncidentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    // Get member ID for reported_by
    const { data: member } = await auth.supabase
      .from('elijah_member')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('organization_id', auth.organizationId)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Elijah member record not found' }, { status: 400 })
    }

    const { type, severity, description, location } = parsed.data

    const insertData: Record<string, unknown> = {
      organization_id: auth.organizationId,
      type,
      severity,
      description,
      reported_by: member.id,
    }

    if (location) {
      insertData.location = `SRID=4326;POINT(${location.lng} ${location.lat})`
    }

    const { data: incident, error } = await auth.supabase
      .from('elijah_incident')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 })
    }

    // Auto-create timeline event
    await auth.supabase.from('elijah_incident_timeline_event').insert({
      incident_id: incident.id,
      event_type: 'created',
      actor_id: member.id,
      notes: `Incident reported: ${type} (${severity})`,
    })

    return NextResponse.json({ incident }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
