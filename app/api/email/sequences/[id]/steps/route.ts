import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/email/sequences/[id]/steps
 * List all steps for a sequence
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

    // Verify sequence belongs to organization
    const { data: sequence } = await supabase
      .from('email_sequences')
      .select('id')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('email_sequence_steps')
      .select('*, email_templates(id, name, subject)')
      .eq('sequence_id', id)
      .order('step_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch steps' }, { status: 500 })
    }

    return NextResponse.json({ steps: data })
  } catch (error) {
    console.error('Steps fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/email/sequences/[id]/steps
 * Add a step to a sequence
 */
export async function POST(
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

    // Verify sequence belongs to organization
    const { data: sequence } = await supabase
      .from('email_sequences')
      .select('id, is_active')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    const body = await request.json()

    if (!body.step_type) {
      return NextResponse.json({ error: 'Step type is required' }, { status: 400 })
    }

    // Get current max step order
    const { data: maxStep } = await supabase
      .from('email_sequence_steps')
      .select('step_order')
      .eq('sequence_id', id)
      .order('step_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxStep?.step_order || 0) + 1

    const { data, error } = await supabase
      .from('email_sequence_steps')
      .insert({
        sequence_id: id,
        step_order: body.step_order ?? nextOrder,
        step_type: body.step_type,
        template_id: body.template_id || null,
        subject_override: body.subject_override || null,
        delay_days: body.delay_days || 0,
        delay_hours: body.delay_hours || 0,
        delay_minutes: body.delay_minutes || 0,
        conditions: body.conditions || {},
        stats: { sent: 0, opened: 0, clicked: 0 },
      })
      .select('*, email_templates(id, name, subject)')
      .single()

    if (error) {
      console.error('Step creation error:', error)
      return NextResponse.json({ error: 'Failed to create step' }, { status: 500 })
    }

    return NextResponse.json({ step: data }, { status: 201 })
  } catch (error) {
    console.error('Step creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/email/sequences/[id]/steps
 * Bulk update steps (for reordering)
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

    // Verify sequence belongs to organization
    const { data: sequence } = await supabase
      .from('email_sequences')
      .select('id')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    const body = await request.json()
    const { steps } = body

    if (!Array.isArray(steps)) {
      return NextResponse.json({ error: 'Steps array required' }, { status: 400 })
    }

    // Update each step's order
    for (const step of steps) {
      if (step.id && step.step_order !== undefined) {
        await supabase
          .from('email_sequence_steps')
          .update({ step_order: step.step_order })
          .eq('id', step.id)
          .eq('sequence_id', id)
      }
    }

    // Fetch updated steps
    const { data: updatedSteps } = await supabase
      .from('email_sequence_steps')
      .select('*, email_templates(id, name, subject)')
      .eq('sequence_id', id)
      .order('step_order', { ascending: true })

    return NextResponse.json({ steps: updatedSteps })
  } catch (error) {
    console.error('Steps update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
