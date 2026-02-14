import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { data: unit, error } = await auth.supabase
      .from('accommodation_units')
      .select('*, accommodation_rooms(*)')
      .eq('id', params.id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error || !unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    }

    return NextResponse.json({ unit })
  } catch (error) {
    console.error('Unit GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const { name, type, unit_code, bedrooms, bathrooms, max_guests, max_adults, max_children, max_capacity, has_rooms, size_sqm, floor_level, base_price_per_night, amenities, description, status, sort_order } = body

    const { data: unit, error } = await auth.supabase
      .from('accommodation_units')
      .update({
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(unit_code !== undefined && { unit_code }),
        ...(bedrooms !== undefined && { bedrooms }),
        ...(bathrooms !== undefined && { bathrooms }),
        ...(max_guests !== undefined && { max_guests }),
        ...(max_adults !== undefined && { max_adults }),
        ...(max_children !== undefined && { max_children }),
        ...(max_capacity !== undefined && { max_capacity }),
        ...(has_rooms !== undefined && { has_rooms }),
        ...(size_sqm !== undefined && { size_sqm }),
        ...(floor_level !== undefined && { floor_level }),
        ...(base_price_per_night !== undefined && { base_price_per_night }),
        ...(amenities !== undefined && { amenities }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(sort_order !== undefined && { sort_order }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !unit) {
      return NextResponse.json({ error: 'Failed to update unit' }, { status: 500 })
    }

    return NextResponse.json({ unit })
  } catch (error) {
    console.error('Unit PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { error } = await auth.supabase
      .from('accommodation_units')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', auth.organizationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete unit' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unit DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
