import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/email/sequences/[id]
 * Get a single sequence with its steps
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
      .from('email_sequences')
      .select('*, email_sequence_steps(*, email_templates(id, name, subject))')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    // Sort steps by order
    if (data.email_sequence_steps) {
      data.email_sequence_steps.sort(
        (a: { step_order: number }, b: { step_order: number }) => a.step_order - b.step_order
      )
    }

    return NextResponse.json({ sequence: data })
  } catch (error) {
    console.error('Sequence fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/email/sequences/[id]
 * Update a sequence
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

    // Check sequence exists
    const { data: existing } = await supabase
      .from('email_sequences')
      .select('id')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    const body = await request.json()

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.trigger_type !== undefined) updates.trigger_type = body.trigger_type
    if (body.trigger_rules !== undefined) updates.trigger_rules = body.trigger_rules
    if (body.is_active !== undefined) updates.is_active = body.is_active
    if (body.allow_reenroll !== undefined) updates.allow_reenroll = body.allow_reenroll
    if (body.exit_on_reply !== undefined) updates.exit_on_reply = body.exit_on_reply

    const { data, error } = await supabase
      .from('email_sequences')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to update sequence' }, { status: 500 })
    }

    return NextResponse.json({ sequence: data })
  } catch (error) {
    console.error('Sequence update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/email/sequences/[id]
 * Delete a sequence and its steps
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

    // Check if sequence is active
    const { data: existing } = await supabase
      .from('email_sequences')
      .select('is_active')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    if (existing.is_active) {
      return NextResponse.json(
        { error: 'Cannot delete active sequence. Deactivate it first.' },
        { status: 400 }
      )
    }

    // Delete steps first (cascade might handle this, but being explicit)
    await supabase.from('email_sequence_steps').delete().eq('sequence_id', id)

    // Delete sequence
    const { error } = await supabase
      .from('email_sequences')
      .delete()
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete sequence' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sequence delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
