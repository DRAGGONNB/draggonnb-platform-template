import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrg } from '@/lib/auth/get-user-org'

/**
 * GET /api/content/queue
 * Lists content queue items for the authenticated user's organization
 *
 * Query parameters:
 * - status: Filter by status (pending_approval, approved, scheduled, published, rejected)
 * - platform: Filter by platform (facebook, instagram, linkedin, twitter)
 * - limit: Number of items to return (default: 50)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(request: Request) {
  try {
    // Get authenticated user and organization
    const { data: userOrg, error: authError } = await getUserOrg()

    if (authError || !userOrg) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const platform = searchParams.get('platform')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('content_queue')
      .select('*', { count: 'exact' })
      .eq('organization_id', userOrg.organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    // Apply platform filter
    if (platform) {
      query = query.eq('platform', platform)
    }

    const { data: items, error, count } = await query

    if (error) {
      console.error('Error fetching content queue:', error)
      return NextResponse.json({ error: 'Failed to fetch content queue' }, { status: 500 })
    }

    return NextResponse.json({
      items: items || [],
      total: count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('Content queue GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/content/queue
 * Creates a new content queue item for the authenticated user's organization
 *
 * Request body:
 * - content: string (required) - The content to be published
 * - platform: string (required) - Target platform (facebook, instagram, linkedin, twitter)
 * - status: string (optional) - Initial status (default: pending_approval)
 * - publish_at: string (optional) - Scheduled publish time (ISO 8601 format)
 */
export async function POST(request: Request) {
  try {
    // Get authenticated user and organization
    const { data: userOrg, error: authError } = await getUserOrg()

    if (authError || !userOrg) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()
    const { content, platform, status, publish_at } = body

    // Validate required fields
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    if (!platform) {
      return NextResponse.json({ error: 'Platform is required' }, { status: 400 })
    }

    // Validate platform
    const validPlatforms = ['facebook', 'instagram', 'linkedin', 'twitter']
    if (!validPlatforms.includes(platform.toLowerCase())) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate status if provided
    const validStatuses = ['pending_approval', 'approved', 'scheduled', 'published', 'rejected']
    const itemStatus = status || 'pending_approval'
    if (!validStatuses.includes(itemStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate publish_at if provided
    let publishAtDate: string | null = null
    if (publish_at) {
      const parsedDate = new Date(publish_at)
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid publish_at date format. Use ISO 8601 format.' },
          { status: 400 }
        )
      }
      publishAtDate = parsedDate.toISOString()
    }

    // Create content queue item
    const { data: item, error } = await supabase
      .from('content_queue')
      .insert({
        organization_id: userOrg.organizationId,
        content,
        platform: platform.toLowerCase(),
        status: itemStatus,
        publish_at: publishAtDate,
        created_by: userOrg.userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating content queue item:', error)
      return NextResponse.json({ error: 'Failed to create content queue item' }, { status: 500 })
    }

    return NextResponse.json({ item }, { status: 201 })

  } catch (error) {
    console.error('Content queue POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
