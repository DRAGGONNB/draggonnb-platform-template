import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateSequenceRequest } from '@/lib/email/types'

/**
 * GET /api/email/sequences
 * List all sequences for the organization
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
      .from('email_sequences')
      .select('*, email_sequence_steps(count)')
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false })

    if (active !== null) {
      query = query.eq('is_active', active === 'true')
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch sequences' }, { status: 500 })
    }

    return NextResponse.json({ sequences: data })
  } catch (error) {
    console.error('Sequences list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/email/sequences
 * Create a new sequence
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

    const body: CreateSequenceRequest = await request.json()

    if (!body.name || !body.trigger_type) {
      return NextResponse.json(
        { error: 'Name and trigger type are required' },
        { status: 400 }
      )
    }

    // Create sequence
    const { data: sequence, error: seqError } = await supabase
      .from('email_sequences')
      .insert({
        organization_id: userData.organization_id,
        name: body.name,
        description: body.description,
        trigger_type: body.trigger_type,
        trigger_rules: body.trigger_rules || {},
        is_active: false,
        allow_reenroll: false,
        exit_on_reply: true,
        total_enrolled: 0,
        total_completed: 0,
        created_by: user.id,
      })
      .select()
      .single()

    if (seqError) {
      console.error('Sequence creation error:', seqError)
      return NextResponse.json({ error: 'Failed to create sequence' }, { status: 500 })
    }

    // Create steps if provided
    if (body.steps && body.steps.length > 0) {
      const stepsToInsert = body.steps.map((step) => ({
        sequence_id: sequence.id,
        step_order: step.step_order,
        step_type: step.step_type,
        template_id: step.template_id,
        subject_override: step.subject_override,
        delay_days: step.delay_days || 0,
        delay_hours: step.delay_hours || 0,
        delay_minutes: step.delay_minutes || 0,
        conditions: step.conditions || {},
        stats: { sent: 0, opened: 0, clicked: 0 },
      }))

      const { error: stepsError } = await supabase
        .from('email_sequence_steps')
        .insert(stepsToInsert)

      if (stepsError) {
        console.error('Steps creation error:', stepsError)
      }
    }

    // Fetch sequence with steps
    const { data: fullSequence } = await supabase
      .from('email_sequences')
      .select('*, email_sequence_steps(*)')
      .eq('id', sequence.id)
      .single()

    return NextResponse.json({ sequence: fullSequence }, { status: 201 })
  } catch (error) {
    console.error('Sequence creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
