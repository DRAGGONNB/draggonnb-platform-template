import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PUT /api/email/sequences/[id]/steps/[stepId]
 * Update a single step
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { id, stepId } = await params
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

    // Verify step belongs to sequence
    const { data: existingStep } = await supabase
      .from('email_sequence_steps')
      .select('id')
      .eq('id', stepId)
      .eq('sequence_id', id)
      .single()

    if (!existingStep) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 })
    }

    const body = await request.json()

    // Build update object
    const updates: Record<string, unknown> = {}

    if (body.step_order !== undefined) updates.step_order = body.step_order
    if (body.step_type !== undefined) updates.step_type = body.step_type
    if (body.template_id !== undefined) updates.template_id = body.template_id
    if (body.subject_override !== undefined) updates.subject_override = body.subject_override
    if (body.delay_days !== undefined) updates.delay_days = body.delay_days
    if (body.delay_hours !== undefined) updates.delay_hours = body.delay_hours
    if (body.delay_minutes !== undefined) updates.delay_minutes = body.delay_minutes
    if (body.conditions !== undefined) updates.conditions = body.conditions

    const { data, error } = await supabase
      .from('email_sequence_steps')
      .update(updates)
      .eq('id', stepId)
      .eq('sequence_id', id)
      .select('*, email_templates(id, name, subject)')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to update step' }, { status: 500 })
    }

    return NextResponse.json({ step: data })
  } catch (error) {
    console.error('Step update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/email/sequences/[id]/steps/[stepId]
 * Delete a single step
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { id, stepId } = await params
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

    // Get the step to delete (to know its order)
    const { data: stepToDelete } = await supabase
      .from('email_sequence_steps')
      .select('step_order')
      .eq('id', stepId)
      .eq('sequence_id', id)
      .single()

    if (!stepToDelete) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 })
    }

    // Delete the step
    const { error } = await supabase
      .from('email_sequence_steps')
      .delete()
      .eq('id', stepId)
      .eq('sequence_id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete step' }, { status: 500 })
    }

    // Reorder remaining steps
    const { data: remainingSteps } = await supabase
      .from('email_sequence_steps')
      .select('id, step_order')
      .eq('sequence_id', id)
      .gt('step_order', stepToDelete.step_order)
      .order('step_order', { ascending: true })

    if (remainingSteps && remainingSteps.length > 0) {
      for (const step of remainingSteps) {
        await supabase
          .from('email_sequence_steps')
          .update({ step_order: step.step_order - 1 })
          .eq('id', step.id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Step delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
