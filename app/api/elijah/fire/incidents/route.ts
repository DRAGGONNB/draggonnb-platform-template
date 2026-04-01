import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'
import { createFireIncidentSchema } from '@/lib/elijah/validations'

export async function GET() {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const { data, error } = await auth.supabase
      .from('elijah_fire_incident')
      .select(`
        *,
        incident:elijah_incident!incident_id(*),
        water_point:elijah_fire_water_point!nearest_water_point_id(id, name, type, status),
        farm:elijah_fire_farm!farm_id(id, name, owner_name),
        dispatches:elijah_fire_incident_group_dispatch(
          id, dispatched_at, arrived_at, stood_down_at,
          group:elijah_fire_responder_group(id, name, type)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch fire incidents' }, { status: 500 })
    }

    return NextResponse.json({ fire_incidents: data || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createFireIncidentSchema.safeParse(body)
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

    const { fire_type, wind_direction, wind_speed_kmh, description, location, farm_id } = parsed.data

    // Step 1: Create base incident (type=fire, severity=critical)
    const { data: incident, error: incErr } = await auth.supabase
      .from('elijah_incident')
      .insert({
        organization_id: auth.organizationId,
        type: 'fire',
        severity: 'critical',
        status: 'open',
        description,
        reported_by: member.id,
        location: `SRID=4326;POINT(${location.lng} ${location.lat})`,
      })
      .select()
      .single()

    if (incErr || !incident) {
      return NextResponse.json({ error: 'Failed to create base incident' }, { status: 500 })
    }

    // Step 2: Create fire-specific record
    const fireData: Record<string, unknown> = {
      incident_id: incident.id,
      fire_type,
      wind_direction: wind_direction || null,
      wind_speed_kmh: wind_speed_kmh || null,
      status: 'reported',
      farm_id: farm_id || null,
    }

    // Step 3: Find nearest water point
    const { data: nearestWp } = await auth.supabase.rpc('elijah_nearest_water_points', {
      org_id: auth.organizationId,
      lat: location.lat,
      lng: location.lng,
      max_results: 1,
    }).maybeSingle()

    if (nearestWp) {
      fireData.nearest_water_point_id = (nearestWp as Record<string, unknown>).id as string
    }

    const { data: fireIncident, error: fireErr } = await auth.supabase
      .from('elijah_fire_incident')
      .insert(fireData)
      .select()
      .single()

    if (fireErr) {
      return NextResponse.json({ error: 'Failed to create fire incident record' }, { status: 500 })
    }

    // Timeline event
    await auth.supabase.from('elijah_incident_timeline_event').insert({
      incident_id: incident.id,
      event_type: 'fire_reported',
      actor_id: member.id,
      notes: `Fire reported: ${fire_type}${wind_direction ? `, wind ${wind_direction}` : ''}`,
    })

    return NextResponse.json({ incident, fire_incident: fireIncident }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
