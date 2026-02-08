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
    const search = searchParams.get('search') || ''
    const vip = searchParams.get('vip')

    let query = supabase
      .from('accommodation_guests')
      .select('*', { count: 'exact' })
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
    }
    if (vip === 'true') query = query.eq('vip_status', true)

    const { data: guests, error, count } = await query
    if (error) return NextResponse.json({ error: 'Failed to fetch guests' }, { status: 500 })

    return NextResponse.json({ guests: guests || [], total: count || 0 })
  } catch (error) {
    console.error('Guests GET error:', error)
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

    const body = await request.json()
    const { first_name, last_name, email, phone, nationality, notes } = body

    if (!first_name || !last_name) {
      return NextResponse.json({ error: 'First and last name are required' }, { status: 400 })
    }

    const { data: guest, error } = await supabase
      .from('accommodation_guests')
      .insert({
        organization_id: userData.organization_id,
        first_name,
        last_name,
        email: email || null,
        phone: phone || null,
        nationality: nationality || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Guest with this email already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create guest' }, { status: 500 })
    }

    return NextResponse.json({ guest }, { status: 201 })
  } catch (error) {
    console.error('Guests POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
