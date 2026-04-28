import { NextResponse } from 'next/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { guardUsage } from '@/lib/usage/guard'
import { UsageCapExceededError } from '@/lib/usage/types'

/**
 * POST /api/content/generate
 * Generates social media content using Claude AI via N8N workflow
 *
 * ERR-034 fix: replaced from('users') with getUserOrg() (users table does not exist)
 * USAGE-13: replaced checkUsage/incrementUsage with guardUsage()
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

    // Get authenticated user and org (ERR-034: was querying non-existent users table)
    const { data: userOrg, error: orgError } = await getUserOrg()
    if (orgError || !userOrg) {
      return NextResponse.json(
        { error: orgError ?? 'org_lookup_failed' },
        { status: 401 }
      )
    }

    const organizationId = userOrg.organizationId

    // Guard usage atomically (advisory-lock-hardened via migration 28)
    try {
      await guardUsage({ orgId: organizationId, metric: 'ai_generations', qty: 1 })
    } catch (err) {
      if (err instanceof UsageCapExceededError) {
        return NextResponse.json(
          {
            error: 'usage_cap_exceeded',
            metric: err.metric,
            used: err.currentUsage,
            limit: err.limit,
          },
          { status: 429 }
        )
      }
      console.error('guardUsage error (content/generate):', err)
      return NextResponse.json({ error: 'Usage check failed' }, { status: 500 })
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
          userId: userOrg.userId,
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
    const contents = platforms.map((platform: string) => {
      const rawContent = result?.data?.content || result?.content || ''
      const hashtagMatches = rawContent.match(/#\w+/g) || []
      const hashtags = hashtagMatches.map((tag: string) => tag)

      return {
        platform,
        content: rawContent,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        imagePrompt: result?.data?.imagePrompt || undefined,
      }
    })

    return NextResponse.json({
      success: true,
      data: { contents },
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
