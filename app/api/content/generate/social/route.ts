import { NextResponse } from 'next/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { buildSocialPrompt } from '@/lib/content-studio/prompt-builder'
import { guardUsage } from '@/lib/usage/guard'
import { UsageCapExceededError } from '@/lib/usage/types'
import type { SocialGenerationInput, SocialGenerationOutput } from '@/lib/content-studio/types'

/**
 * POST /api/content/generate/social
 * USAGE-13: replaced checkUsage/incrementUsage with guardUsage()
 *           replaced from('users') with getUserOrg()
 */
export async function POST(request: Request) {
  try {
    const body: SocialGenerationInput = await request.json()

    if (!body.platforms?.length || !body.goal || !body.tone || !body.audience || !body.topic) {
      return NextResponse.json(
        { error: 'Platforms, goal, tone, audience, and topic are required' },
        { status: 400 }
      )
    }

    // Auth + org lookup
    const { data: userOrg, error: orgError } = await getUserOrg()
    if (orgError || !userOrg) {
      return NextResponse.json({ error: orgError ?? 'org_lookup_failed' }, { status: 401 })
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
      console.error('guardUsage error (content/generate/social):', err)
      return NextResponse.json({ error: 'Usage check failed' }, { status: 500 })
    }

    // Build prompt and call N8N
    const prompt = buildSocialPrompt(body)
    const n8nWebhookUrl = `${process.env.N8N_BASE_URL}${process.env.N8N_WEBHOOK_SOCIAL_CONTENT || '/webhook/draggonnb-generate-social-content'}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    let n8nResponse: Response
    try {
      n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          prompt,
          platforms: body.platforms,
          goal: body.goal,
          tone: body.tone,
          audience: body.audience,
          topic: body.topic,
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

    // Parse the response
    let socialOutput: SocialGenerationOutput
    try {
      const rawContent = result?.data?.content || result?.content || result?.data || result
      socialOutput = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent
    } catch {
      // Fallback: wrap raw content as single-platform output
      socialOutput = {
        platforms: body.platforms.map(p => ({
          platform: p,
          variants: [result?.data?.content || result?.content || 'Generated content'],
          hashtags: [],
          imagePrompt: '',
          ctaSuggestion: '',
          bestPostTime: '',
        })),
      }
    }

    return NextResponse.json({
      success: true,
      data: socialOutput,
    })
  } catch (error) {
    console.error('Social content generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate social content', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
