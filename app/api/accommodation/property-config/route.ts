import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')

    if (!propertyId) {
      return NextResponse.json({ error: 'property_id is required' }, { status: 400 })
    }

    const { data: config, error } = await auth.supabase
      .from('accommodation_property_config')
      .select('*')
      .eq('property_id', propertyId)
      .eq('organization_id', auth.organizationId)

    if (error) return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })

    return NextResponse.json({ config: config || [] })
  } catch (error) {
    console.error('Property config GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const { property_id, config_key, config_value } = body

    if (!property_id || !config_key) {
      return NextResponse.json({ error: 'property_id and config_key are required' }, { status: 400 })
    }

    // Upsert: update if exists, insert if not
    const { data: config, error } = await auth.supabase
      .from('accommodation_property_config')
      .upsert(
        {
          organization_id: auth.organizationId,
          property_id,
          config_key,
          config_value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'property_id,config_key' }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Property config POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
