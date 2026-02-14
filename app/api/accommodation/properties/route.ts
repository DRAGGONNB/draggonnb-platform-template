import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = auth.supabase
      .from('accommodation_properties')
      .select('*, accommodation_units(count)', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data: properties, error, count } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
    }

    return NextResponse.json({ properties: properties || [], total: count || 0 })
  } catch (error) {
    console.error('Properties GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const {
      name, type, property_type_config, address, city, province, postal_code, country,
      latitude, longitude, timezone, currency, amenities, check_in_time, check_out_time,
      description, policies, contact_email, contact_phone, website, star_rating,
    } = body

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }

    const { data: property, error } = await auth.supabase
      .from('accommodation_properties')
      .insert({
        organization_id: auth.organizationId,
        name,
        type,
        property_type_config: property_type_config || 'guest_house',
        address: address || null,
        city: city || null,
        province: province || null,
        postal_code: postal_code || null,
        country: country || 'South Africa',
        latitude: latitude || null,
        longitude: longitude || null,
        timezone: timezone || 'Africa/Johannesburg',
        currency: currency || 'ZAR',
        amenities: amenities || [],
        check_in_time: check_in_time || '14:00',
        check_out_time: check_out_time || '10:00',
        description: description || null,
        policies: policies || {},
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        website: website || null,
        star_rating: star_rating || null,
        created_by: auth.userId,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create property' }, { status: 500 })
    }

    return NextResponse.json({ property }, { status: 201 })
  } catch (error) {
    console.error('Properties POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
