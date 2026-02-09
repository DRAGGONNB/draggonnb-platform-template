import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildSocialPrompt } from '@/lib/content-studio/prompt-builder'
import { checkUsage, incrementUsage } from '@/lib/tier/feature-gate'
import type { SocialGenerationInput, SocialGenerationOutput } from '@/lib/content-studio/types'

export async function POST(request: Request) {
  try {
    const body: SocialGenerationInput = await request.json()

    if (!body.platforms?.length || !body.goal || !body.tone || !body.audience || !body.topic) {
      return NextResponse.json(
        { error: 'Platforms, goal, tone, audience, and topic are required' },
        { status: 400 }
      )
    }

    // Auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get org
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const organizationId = userData.organization_id

    // Usage check (atomic via centralized feature gate)
    const usageCheck = await checkUsage(organizationId, 'ai_generations')

    if (!usageCheck.allowed) {
      return NextResponse.json(
        { error: 'Monthly AI generation limit reached', limit: usageCheck.limit, current: usageCheck.current },
        { status: 429 }
      )
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

    // Atomically increment usage
    await incrementUsage(organizationId, 'ai_generations')

    return NextResponse.json({
      success: true,
      data: socialOutput,
      usage: { current: usageCheck.current + 1, limit: usageCheck.limit },
    })
  } catch (error) {
    console.error('Social content generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate social content', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

