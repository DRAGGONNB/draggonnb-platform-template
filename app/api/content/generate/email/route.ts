import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildEmailPrompt } from '@/lib/content-studio/prompt-builder'
import { checkUsage, incrementUsage } from '@/lib/tier/feature-gate'
import type { EmailGenerationInput, EmailGenerationOutput } from '@/lib/content-studio/types'

export async function POST(request: Request) {
  try {
    const body: EmailGenerationInput = await request.json()

    if (!body.goal || !body.tone || !body.audience) {
      return NextResponse.json(
        { error: 'Goal, tone, and audience are required' },
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
    const prompt = buildEmailPrompt(body)
    const n8nWebhookUrl = `${process.env.N8N_BASE_URL}${process.env.N8N_WEBHOOK_EMAIL_CONTENT || '/webhook/draggonnb-generate-email-content'}`

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
          goal: body.goal,
          tone: body.tone,
          audience: body.audience,
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

    // Parse the response — N8N may return raw JSON or wrapped
    let emailOutput: EmailGenerationOutput
    try {
      const rawContent = result?.data?.content || result?.content || result?.data || result
      emailOutput = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent
    } catch {
      emailOutput = {
        subjectLines: ['Check this out'],
        shortBody: result?.data?.content || result?.content || 'Generated content',
        longBody: result?.data?.content || result?.content || 'Generated content',
        followUpSuggestion: 'Send a follow-up in 3 days',
      }
    }

    // Atomically increment usage
    await incrementUsage(organizationId, 'ai_generations')

    return NextResponse.json({
      success: true,
      data: emailOutput,
      usage: { current: usageCheck.current + 1, limit: usageCheck.limit },
    })
  } catch (error) {
    console.error('Email content generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate email content', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

