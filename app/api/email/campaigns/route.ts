import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateCampaignRequest } from '@/lib/email/types'

/**
 * GET /api/email/campaigns
 * List all campaigns for the organization
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
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    // Build query
    let query = supabase
      .from('email_campaigns')
      .select('*, email_templates(name)')
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,subject.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
    }

    return NextResponse.json({ campaigns: data })
  } catch (error) {
    console.error('Campaigns list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/email/campaigns
 * Create a new campaign
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
    const body: CreateCampaignRequest = await request.json()

    // Validate required fields
    if (!body.name || !body.subject) {
      return NextResponse.json(
        { error: 'Name and subject are required' },
        { status: 400 }
      )
    }

    // Must have either template_id or html_content
    if (!body.template_id && !body.html_content) {
      return NextResponse.json(
        { error: 'Either template_id or html_content is required' },
        { status: 400 }
      )
    }

    // Create campaign
    const { data, error } = await supabase
      .from('email_campaigns')
      .insert({
        organization_id: userData.organization_id,
        name: body.name,
        subject: body.subject,
        preview_text: body.preview_text,
        template_id: body.template_id,
        html_content: body.html_content,
        segment_rules: body.segment_rules || {},
        status: 'draft',
        recipient_count: 0,
        scheduled_for: body.scheduled_for,
        stats: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 },
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Campaign creation error:', error)
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
    }

    return NextResponse.json({ campaign: data }, { status: 201 })
  } catch (error) {
    console.error('Campaign creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
