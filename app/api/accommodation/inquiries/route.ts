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
    const stage = searchParams.get('stage')
    const propertyId = searchParams.get('property_id')

    let query = supabase
      .from('accommodation_inquiries')
      .select('*, accommodation_properties(name), accommodation_units(name)', { count: 'exact' })
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false })

    if (stage) query = query.eq('stage', stage)
    if (propertyId) query = query.eq('property_id', propertyId)

    const { data: inquiries, error, count } = await query
    if (error) return NextResponse.json({ error: 'Failed to fetch inquiries' }, { status: 500 })

    return NextResponse.json({ inquiries: inquiries || [], total: count || 0 })
  } catch (error) {
    console.error('Inquiries GET error:', error)
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
    const { property_id, unit_id, guest_name, guest_email, guest_phone, check_in_date, check_out_date, guests_count, quoted_price, source, special_requests } = body

    if (!guest_name) {
      return NextResponse.json({ error: 'Guest name is required' }, { status: 400 })
    }

    const { data: inquiry, error } = await supabase
      .from('accommodation_inquiries')
      .insert({
        organization_id: userData.organization_id,
        property_id: property_id || null,
        unit_id: unit_id || null,
        guest_name,
        guest_email: guest_email || null,
        guest_phone: guest_phone || null,
        check_in_date: check_in_date || null,
        check_out_date: check_out_date || null,
        guests_count: guests_count || 1,
        quoted_price: quoted_price || null,
        source: source || 'direct',
        special_requests: special_requests || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to create inquiry' }, { status: 500 })

    return NextResponse.json({ inquiry }, { status: 201 })
  } catch (error) {
    console.error('Inquiries POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
