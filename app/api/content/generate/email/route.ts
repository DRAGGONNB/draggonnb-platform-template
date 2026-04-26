import { NextResponse } from 'next/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { buildEmailPrompt } from '@/lib/content-studio/prompt-builder'
import { guardUsage } from '@/lib/usage/guard'
import { UsageCapExceededError } from '@/lib/usage/types'
import type { EmailGenerationInput, EmailGenerationOutput } from '@/lib/content-studio/types'

/**
 * POST /api/content/generate/email
 * USAGE-13: replaced checkUsage/incrementUsage with guardUsage()
 *           replaced from('users') with getUserOrg()
 * Note: this route GENERATES email copy (ai_generations metric), it does NOT send email.
 */
export async function POST(request: Request) {
  try {
    const body: EmailGenerationInput = await request.json()

    if (!body.goal || !body.tone || !body.audience) {
      return NextResponse.json(
        { error: 'Goal, tone, and audience are required' },
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
      console.error('guardUsage error (content/generate/email):', err)
      return NextResponse.json({ error: 'Usage check failed' }, { status: 500 })
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

    return NextResponse.json({
      success: true,
      data: emailOutput,
    })
  } catch (error) {
    console.error('Email content generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate email content', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
