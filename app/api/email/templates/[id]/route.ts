import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/email/templates/[id]
 * Get a single template by ID
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

    // Get template
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template: data })
  } catch (error) {
    console.error('Template fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/email/templates/[id]
 * Update a template
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

    // Parse request body
    const body = await request.json()

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) updates.name = body.name
    if (body.subject !== undefined) updates.subject = body.subject
    if (body.description !== undefined) updates.description = body.description
    if (body.html_content !== undefined) {
      updates.html_content = body.html_content
      // Re-extract variables if HTML changed
      const variableMatches = body.html_content.match(/\{\{(\w+)\}\}/g) || []
      updates.variables = [...new Set(variableMatches.map((m: string) => m.replace(/\{\{|\}\}/g, '')))]
    }
    if (body.text_content !== undefined) updates.text_content = body.text_content
    if (body.editor_json !== undefined) updates.editor_json = body.editor_json
    if (body.category !== undefined) updates.category = body.category
    if (body.is_active !== undefined) updates.is_active = body.is_active
    if (body.variables !== undefined) updates.variables = body.variables

    // Update template
    const { data, error } = await supabase
      .from('email_templates')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    return NextResponse.json({ template: data })
  } catch (error) {
    console.error('Template update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/email/templates/[id]
 * Delete a template
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

    // Check if template is used in any campaigns or sequences
    const { count: campaignCount } = await supabase
      .from('email_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('template_id', id)

    if (campaignCount && campaignCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete template that is used in campaigns' },
        { status: 400 }
      )
    }

    const { count: stepCount } = await supabase
      .from('email_sequence_steps')
      .select('id', { count: 'exact', head: true })
      .eq('template_id', id)

    if (stepCount && stepCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete template that is used in sequences' },
        { status: 400 }
      )
    }

    // Delete template
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Template delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
