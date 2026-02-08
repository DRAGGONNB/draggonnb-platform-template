import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateTemplateRequest } from '@/lib/email/types'

/**
 * GET /api/email/templates
 * List all templates for the organization
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const active = searchParams.get('active')
    const search = searchParams.get('search')

    // Build query
    let query = supabase
      .from('email_templates')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .order('updated_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    if (active !== null) {
      query = query.eq('is_active', active === 'true')
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,subject.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    return NextResponse.json({ templates: data })
  } catch (error) {
    console.error('Templates list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/email/templates
 * Create a new template
 */
export async function POST(request: NextRequest) {
  try {
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
    const body: CreateTemplateRequest = await request.json()

    // Validate required fields
    if (!body.name || !body.subject || !body.html_content) {
      return NextResponse.json(
        { error: 'Name, subject, and HTML content are required' },
        { status: 400 }
      )
    }

    // Extract variables from HTML content
    const variableMatches = body.html_content.match(/\{\{(\w+)\}\}/g) || []
    const variables = body.variables || [
      ...new Set(variableMatches.map((m) => m.replace(/\{\{|\}\}/g, ''))),
    ]

    // Create template
    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        organization_id: userData.organization_id,
        name: body.name,
        subject: body.subject,
        description: body.description,
        html_content: body.html_content,
        text_content: body.text_content,
        editor_json: body.editor_json,
        variables,
        category: body.category || 'general',
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Template creation error:', error)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json({ template: data }, { status: 201 })
  } catch (error) {
    console.error('Template creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
