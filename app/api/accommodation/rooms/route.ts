import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const unitId = searchParams.get('unit_id')

    let query = auth.supabase
      .from('accommodation_rooms')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('sort_order', { ascending: true })

    if (unitId) query = query.eq('unit_id', unitId)

    const { data: rooms, error, count } = await query
    if (error) return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 })

    return NextResponse.json({ rooms: rooms || [], total: count || 0 })
  } catch (error) {
    console.error('Rooms GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const { unit_id, name, room_code, room_type, bed_config, max_guests, has_ensuite, amenities, description, sort_order } = body

    if (!unit_id || !name) {
      return NextResponse.json({ error: 'Unit ID and name are required' }, { status: 400 })
    }

    const { data: room, error } = await auth.supabase
      .from('accommodation_rooms')
      .insert({
        unit_id,
        organization_id: auth.organizationId,
        name,
        room_code: room_code || null,
        room_type: room_type || 'bedroom',
        bed_config: bed_config || 'double',
        max_guests: max_guests || 2,
        has_ensuite: has_ensuite || false,
        amenities: amenities || [],
        description: description || null,
        sort_order: sort_order || 0,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })

    return NextResponse.json({ room }, { status: 201 })
  } catch (error) {
    console.error('Rooms POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
