import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkFeatureAccess } from '@/lib/tier/feature-gate'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
    if (!userData?.organization_id) return NextResponse.json({ error: 'Organization not found' }, { status: 400 })

    const { data: org } = await supabase.from('organizations').select('subscription_tier').eq('id', userData.organization_id).single()
    const access = checkFeatureAccess(org?.subscription_tier || 'core', 'accommodation_module')
    if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')

    let query = supabase
      .from('accommodation_units')
      .select('*', { count: 'exact' })
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false })

    if (propertyId) query = query.eq('property_id', propertyId)

    const { data: units, error, count } = await query
    if (error) return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 })

    return NextResponse.json({ units: units || [], total: count || 0 })
  } catch (error) {
    console.error('Units GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
    if (!userData?.organization_id) return NextResponse.json({ error: 'Organization not found' }, { status: 400 })

    const { data: org } = await supabase.from('organizations').select('subscription_tier').eq('id', userData.organization_id).single()
    const access = checkFeatureAccess(org?.subscription_tier || 'core', 'accommodation_module')
    if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: 403 })

    const body = await request.json()
    const { property_id, name, type, max_guests, base_price_per_night, amenities, description } = body

    if (!property_id || !name || !type) {
      return NextResponse.json({ error: 'Property ID, name, and type are required' }, { status: 400 })
    }

    const { data: unit, error } = await supabase
      .from('accommodation_units')
      .insert({
        property_id,
        organization_id: userData.organization_id,
        name,
        type,
        max_guests: max_guests || 2,
        base_price_per_night: base_price_per_night || 0,
        amenities: amenities || [],
        description: description || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to create unit' }, { status: 500 })

    return NextResponse.json({ unit }, { status: 201 })
  } catch (error) {
    console.error('Units POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
