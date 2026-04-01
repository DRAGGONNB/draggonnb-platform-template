import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'
import { createTimelineEventSchema } from '@/lib/elijah/validations'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const { data, error } = await auth.supabase
      .from('elijah_incident_timeline_event')
      .select(`
        *,
        actor:elijah_member(id, display_name)
      `)
      .eq('incident_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 })
    }

    return NextResponse.json({ events: data || [] })
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
    const parsed = createTimelineEventSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: member } = await auth.supabase
      .from('elijah_member')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('organization_id', auth.organizationId)
      .single()

    const { data: event, error } = await auth.supabase
      .from('elijah_incident_timeline_event')
      .insert({
        incident_id: id,
        event_type: parsed.data.event_type,
        actor_id: member?.id || null,
        notes: parsed.data.notes || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create timeline event' }, { status: 500 })
    }

    return NextResponse.json({ event }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
