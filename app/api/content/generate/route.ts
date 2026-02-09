import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkUsage, incrementUsage } from '@/lib/tier/feature-gate'

/**
 * POST /api/content/generate
 * Generates social media content using Claude AI via N8N workflow
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { topic, platforms, tone, keywords } = body

    // Validate input
    if (!topic || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Topic and at least one platform are required' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const organizationId = userData.organization_id

    // Check usage limits (atomic check via centralized feature gate)
    const usageCheck = await checkUsage(organizationId, 'ai_generations')

    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Monthly AI generation limit reached',
          limit: usageCheck.limit,
          current: usageCheck.current,
        },
        { status: 429 }
      )
    }

    // Call N8N webhook with timeout
    const n8nWebhookUrl = `${process.env.N8N_BASE_URL}${process.env.N8N_WEBHOOK_CONTENT_GENERATOR || '/webhook/draggonnb-generate-content'}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    let n8nResponse: Response
    try {
      n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          topic,
          platforms,
          tone: tone || 'professional',
          keywords: keywords || [],
          userId: user.id,
        }),
        signal: controller.signal,
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Content generation timed out. Please try again.' },
          { status: 504 }
        )
      }
      throw fetchError
    }
    clearTimeout(timeoutId)

    if (!n8nResponse.ok) {
      throw new Error(`N8N webhook failed: ${n8nResponse.statusText}`)
    }

    const result = await n8nResponse.json()

    // Transform N8N response into UI-expected format
    // N8N returns { success, data: { content, post_id } }
    // UI expects { data: { contents: [{ platform, content, hashtags?, imagePrompt? }] } }
    const contents = platforms.map((platform: string) => {
      const rawContent = result?.data?.content || result?.content || ''

      // Extract hashtags from content
      const hashtagMatches = rawContent.match(/#\w+/g) || []
      const hashtags = hashtagMatches.map((tag: string) => tag)

      return {
        platform,
        content: rawContent,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        imagePrompt: result?.data?.imagePrompt || undefined,
      }
    })

    // Atomically increment usage
    await incrementUsage(organizationId, 'ai_generations')

    return NextResponse.json({
      success: true,
      data: { contents },
      usage: {
        current: usageCheck.current + 1,
        limit: usageCheck.limit,
      },
    })
  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate content',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

