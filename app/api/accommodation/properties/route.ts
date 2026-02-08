import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkFeatureAccess } from '@/lib/tier/feature-gate'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    // Feature gate
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', userData.organization_id)
      .single()

    const access = checkFeatureAccess(org?.subscription_tier || 'core', 'accommodation_module')
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason, upgradeRequired: access.upgradeRequired }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('accommodation_properties')
      .select('*, accommodation_units(count)', { count: 'exact' })
      .eq('organization_id', userData.organization_id)
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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', userData.organization_id)
      .single()

    const access = checkFeatureAccess(org?.subscription_tier || 'core', 'accommodation_module')
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: 403 })
    }

    const body = await request.json()
    const { name, type, address, city, province, postal_code, amenities, check_in_time, check_out_time, description } = body

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }

    const { data: property, error } = await supabase
      .from('accommodation_properties')
      .insert({
        organization_id: userData.organization_id,
        name,
        type,
        address: address || null,
        city: city || null,
        province: province || null,
        postal_code: postal_code || null,
        amenities: amenities || [],
        check_in_time: check_in_time || '14:00',
        check_out_time: check_out_time || '10:00',
        description: description || null,
        created_by: user.id,
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
