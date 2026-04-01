import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'
import { createDispatchSchema } from '@/lib/elijah/validations'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const { data, error } = await auth.supabase
      .from('elijah_fire_incident_group_dispatch')
      .select(`
        *,
        group:elijah_fire_responder_group(id, name, type, contact_phone),
        dispatcher:elijah_member!dispatched_by(id, display_name)
      `)
      .eq('fire_incident_id', id)
      .order('dispatched_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch dispatches' }, { status: 500 })
    }

    return NextResponse.json({ dispatches: data || [] })
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
    const parsed = createDispatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: member } = await auth.supabase
      .from('elijah_member')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('organization_id', auth.organizationId)
      .single()

    const { data, error } = await auth.supabase
      .from('elijah_fire_incident_group_dispatch')
      .insert({
        fire_incident_id: id,
        group_id: parsed.data.group_id,
        dispatched_by: member?.id,
      })
      .select('*, group:elijah_fire_responder_group(id, name, type)')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to dispatch group' }, { status: 500 })
    }

    return NextResponse.json({ dispatch: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
