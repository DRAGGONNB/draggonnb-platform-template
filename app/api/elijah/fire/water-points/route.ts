import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'
import { createWaterPointSchema } from '@/lib/elijah/validations'

export async function GET(request: Request) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const nearLat = searchParams.get('lat')
    const nearLng = searchParams.get('lng')
    const limit = searchParams.get('limit') || '50'

    let query = auth.supabase
      .from('elijah_fire_water_point')
      .select('*')
      .eq('organization_id', auth.organizationId)

    // If coordinates provided, order by distance (requires PostGIS RPC for ST_DDistance)
    if (nearLat && nearLng) {
      // Use raw query via RPC for spatial ordering
      const { data, error } = await auth.supabase.rpc('elijah_nearest_water_points', {
        org_id: auth.organizationId,
        lat: parseFloat(nearLat),
        lng: parseFloat(nearLng),
        max_results: parseInt(limit),
      })

      if (error) {
        // Fallback to non-spatial query if RPC not available yet
        const { data: fallback } = await query.order('name').limit(parseInt(limit))
        return NextResponse.json({ water_points: fallback || [], spatial: false })
      }

      return NextResponse.json({ water_points: data || [], spatial: true })
    }

    const { data, error } = await query.order('name').limit(parseInt(limit))

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch water points' }, { status: 500 })
    }

    return NextResponse.json({ water_points: data || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createWaterPointSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { name, location, type, capacity_litres, status, access_notes } = parsed.data

    const { data, error } = await auth.supabase
      .from('elijah_fire_water_point')
      .insert({
        organization_id: auth.organizationId,
        name,
        location: `SRID=4326;POINT(${location.lng} ${location.lat})`,
        type,
        capacity_litres: capacity_litres || null,
        status,
        access_notes: access_notes || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create water point' }, { status: 500 })
    }

    return NextResponse.json({ water_point: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
