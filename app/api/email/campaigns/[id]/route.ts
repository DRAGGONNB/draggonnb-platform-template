import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/email/campaigns/[id]
 * Get a single campaign by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    // Get campaign with template
    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*, email_templates(*)')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ campaign: data })
  } catch (error) {
    console.error('Campaign fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/email/campaigns/[id]
 * Update a campaign
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    // Check campaign exists and is editable
    const { data: existingCampaign } = await supabase
      .from('email_campaigns')
      .select('status')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (!['draft', 'paused'].includes(existingCampaign.status)) {
      return NextResponse.json(
        { error: 'Cannot edit campaign that is sending or sent' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) updates.name = body.name
    if (body.subject !== undefined) updates.subject = body.subject
    if (body.preview_text !== undefined) updates.preview_text = body.preview_text
    if (body.template_id !== undefined) updates.template_id = body.template_id
    if (body.html_content !== undefined) updates.html_content = body.html_content
    if (body.text_content !== undefined) updates.text_content = body.text_content
    if (body.segment_rules !== undefined) updates.segment_rules = body.segment_rules
    if (body.scheduled_for !== undefined) updates.scheduled_for = body.scheduled_for
    if (body.status !== undefined) {
      // Only allow certain status transitions
      const allowedStatuses = ['draft', 'scheduled', 'paused', 'cancelled']
      if (allowedStatuses.includes(body.status)) {
        updates.status = body.status
      }
    }

    // Update campaign
    const { data, error } = await supabase
      .from('email_campaigns')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
    }

    return NextResponse.json({ campaign: data })
  } catch (error) {
    console.error('Campaign update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/email/campaigns/[id]
 * Delete a campaign
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    // Check campaign exists and is deletable
    const { data: existingCampaign } = await supabase
      .from('email_campaigns')
      .select('status')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (existingCampaign.status === 'sending') {
      return NextResponse.json(
        { error: 'Cannot delete campaign that is currently sending' },
        { status: 400 }
      )
    }

    // Delete campaign
    const { error } = await supabase
      .from('email_campaigns')
      .delete()
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Campaign delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
