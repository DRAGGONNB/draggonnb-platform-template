import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/email/outreach
 * List all outreach rules for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
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

    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')

    let query = supabase
      .from('outreach_rules')
      .select('*, email_sequences(id, name)')
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false })

    if (active !== null) {
      query = query.eq('is_active', active === 'true')
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch outreach rules' }, { status: 500 })
    }

    return NextResponse.json({ rules: data })
  } catch (error) {
    console.error('Outreach rules fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/email/outreach
 * Create a new outreach rule
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
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

    const body = await request.json()

    if (!body.name || !body.trigger_event) {
      return NextResponse.json(
        { error: 'Name and trigger event are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('outreach_rules')
      .insert({
        organization_id: userData.organization_id,
        name: body.name,
        description: body.description || null,
        subscription_tiers: body.subscription_tiers || [],
        service_types: body.service_types || [],
        trigger_event: body.trigger_event,
        sequence_id: body.sequence_id || null,
        is_active: false,
        conditions: body.conditions || {},
        created_by: user.id,
      })
      .select('*, email_sequences(id, name)')
      .single()

    if (error) {
      console.error('Outreach rule creation error:', error)
      return NextResponse.json({ error: 'Failed to create outreach rule' }, { status: 500 })
    }

    return NextResponse.json({ rule: data }, { status: 201 })
  } catch (error) {
    console.error('Outreach rule creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
