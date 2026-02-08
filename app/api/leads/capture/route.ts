import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/leads/capture
 * Public endpoint for lead capture. Rate-limited, honeypot anti-spam.
 */

// Simple in-memory rate limiter (IP-based, 5 requests per minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60 * 1000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT) {
    return false
  }

  entry.count++
  return true
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip)
    }
  }
}, 5 * 60 * 1000)

export async function POST(request: NextRequest) {
  try {
    // Rate limit check
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') || 'unknown'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a minute.' },
        { status: 429 }
      )
    }

    const body = await request.json()

    // Honeypot check - if this hidden field has a value, it's a bot
    if (body.honeypot) {
      // Silently accept but don't process
      return NextResponse.json({ success: true, leadId: 'captured' })
    }

    // Validate required fields
    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!body.company_name || typeof body.company_name !== 'string') {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Sanitize and prepare lead data
    const leadData = {
      email: body.email.toLowerCase().trim(),
      company_name: body.company_name.trim(),
      contact_name: body.contact_name?.trim() || null,
      phone: body.phone?.trim() || null,
      website: body.website?.trim() || null,
      industry: body.industry || null,
      company_size: body.company_size || null,
      source: body.source || 'qualify_form',
      business_issues: Array.isArray(body.business_issues)
        ? body.business_issues.filter((issue: unknown) => typeof issue === 'string' && issue.trim())
        : [],
      qualification_status: 'pending',
    }

    // Ensure at least one business issue
    if (leadData.business_issues.length === 0) {
      return NextResponse.json(
        { error: 'At least one business challenge is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check for duplicate leads by email (within last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('email', leadData.email)
      .gte('created_at', twentyFourHoursAgo)
      .limit(1)
      .single()

    if (existingLead) {
      // Return success with existing lead ID (don't create duplicate)
      return NextResponse.json({
        success: true,
        leadId: existingLead.id,
        message: 'Lead already captured',
      })
    }

    // Insert lead
    const { data: lead, error: insertError } = await supabase
      .from('leads')
      .insert(leadData)
      .select('id')
      .single()

    if (insertError || !lead) {
      console.error('Failed to insert lead:', insertError)
      return NextResponse.json(
        { error: 'Failed to capture lead' },
        { status: 500 }
      )
    }

    console.log(`Lead captured: ${lead.id} (${leadData.email})`)

    // Trigger AI qualification async (fire and forget)
    triggerQualificationAsync(lead.id).catch((err) =>
      console.error('Async qualification trigger failed:', err)
    )

    return NextResponse.json({
      success: true,
      leadId: lead.id,
    })
  } catch (error) {
    console.error('Lead capture error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Trigger qualification in the background
 * Calls the internal qualify endpoint
 */
async function triggerQualificationAsync(leadId: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const response = await fetch(`${baseUrl}/api/leads/${leadId}/qualify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
      },
    })

    if (!response.ok) {
      console.error(`Qualification trigger failed for lead ${leadId}: ${response.statusText}`)
    }
  } catch (error) {
    console.error(`Qualification trigger error for lead ${leadId}:`, error)
  }
}
