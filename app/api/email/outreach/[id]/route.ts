import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/email/outreach/[id]
 * Get a single outreach rule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const { data, error } = await supabase
      .from('outreach_rules')
      .select('*, email_sequences(id, name)')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Outreach rule not found' }, { status: 404 })
    }

    return NextResponse.json({ rule: data })
  } catch (error) {
    console.error('Outreach rule fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/email/outreach/[id]
 * Update an outreach rule
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Check rule exists
    const { data: existing } = await supabase
      .from('outreach_rules')
      .select('id')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Outreach rule not found' }, { status: 404 })
    }

    const body = await request.json()

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.subscription_tiers !== undefined) updates.subscription_tiers = body.subscription_tiers
    if (body.service_types !== undefined) updates.service_types = body.service_types
    if (body.trigger_event !== undefined) updates.trigger_event = body.trigger_event
    if (body.sequence_id !== undefined) updates.sequence_id = body.sequence_id
    if (body.is_active !== undefined) updates.is_active = body.is_active
    if (body.conditions !== undefined) updates.conditions = body.conditions

    const { data, error } = await supabase
      .from('outreach_rules')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .select('*, email_sequences(id, name)')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to update outreach rule' }, { status: 500 })
    }

    return NextResponse.json({ rule: data })
  } catch (error) {
    console.error('Outreach rule update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/email/outreach/[id]
 * Delete an outreach rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Check if rule is active
    const { data: existing } = await supabase
      .from('outreach_rules')
      .select('is_active')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Outreach rule not found' }, { status: 404 })
    }

    if (existing.is_active) {
      return NextResponse.json(
        { error: 'Cannot delete active rule. Deactivate it first.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('outreach_rules')
      .delete()
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete outreach rule' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Outreach rule delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
