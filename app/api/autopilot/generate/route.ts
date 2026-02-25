import { NextRequest, NextResponse } from 'next/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { getClientProfile, updateCalendarGenerated } from '@/lib/autopilot/client-profile'
import { BusinessAutopilotAgent } from '@/lib/agents/business-autopilot'
import { checkUsage, incrementUsage } from '@/lib/tier/feature-gate'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AutopilotCalendar, AutopilotCalendarEntry, AutopilotEmailEntry } from '@/lib/agents/types'

function getISOWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function getNextWeekday(dayName: string, baseDate: Date): Date {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const targetDay = days.indexOf(dayName.toLowerCase())
  if (targetDay === -1) return baseDate

  const result = new Date(baseDate)
  const currentDay = result.getDay()
  const diff = ((targetDay - currentDay + 7) % 7) || 7
  result.setDate(result.getDate() + diff)
  return result
}

function wrapEmailHtml(body: string, businessName: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#1a1a2e;padding:24px 32px;">
<h1 style="margin:0;color:#ffffff;font-size:20px;">${businessName}</h1>
</td></tr>
<tr><td style="padding:32px;">
${body.split('\n').map(p => p.trim() ? `<p style="margin:0 0 16px;line-height:1.6;color:#333333;">${p}</p>` : '').join('\n')}
</td></tr>
<tr><td style="background:#f8f8f8;padding:16px 32px;text-align:center;font-size:12px;color:#888888;">
<p style="margin:0;">{{unsubscribe_url}} | {{preferences_url}}</p>
<p style="margin:4px 0 0;">&copy; {{current_year}} ${businessName}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  const { data: userOrg, error: authError } = await getUserOrg()
  if (!userOrg) {
    return NextResponse.json({ error: authError || 'Not authenticated' }, { status: 401 })
  }

  const orgId = userOrg.organizationId

  // Check usage
  const usageCheck = await checkUsage(orgId, 'agent_invocations')
  if (!usageCheck.allowed) {
    return NextResponse.json({
      error: 'Usage limit reached',
      reason: usageCheck.reason,
      current: usageCheck.current,
      limit: usageCheck.limit,
      upgradeRequired: usageCheck.upgradeRequired,
    }, { status: 429 })
  }

  // Load client profile
  const profile = await getClientProfile(orgId)
  if (!profile) {
    return NextResponse.json(
      { error: 'Client profile not found. Complete your Autopilot setup first.' },
      { status: 404 }
    )
  }

  // Determine which week to generate
  let week: string
  try {
    const body = await request.json()
    week = body.week || getISOWeek(new Date())
  } catch {
    week = getISOWeek(new Date())
  }

  // Check if already generated for this week
  if (profile.last_calendar_week === week) {
    return NextResponse.json(
      { error: `Calendar already generated for ${week}. Use chat or refine to make changes.` },
      { status: 409 }
    )
  }

  // Generate calendar
  const agent = new BusinessAutopilotAgent(profile)
  let result
  try {
    result = await agent.generateCalendar(week, orgId)
  } catch (err) {
    console.error('Autopilot generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate content calendar' }, { status: 500 })
  }

  const calendar = result.result as AutopilotCalendar | null
  if (!calendar || !calendar.entries || !Array.isArray(calendar.entries)) {
    return NextResponse.json({
      error: 'Agent returned invalid calendar format',
      raw: result.response,
    }, { status: 500 })
  }

  // Parse week number and year from ISO week
  const [yearStr, weekStr] = week.replace('W', '').split('-')
  const calendarYear = parseInt(yearStr)
  const calendarWeek = parseInt(weekStr)

  const supabase = createAdminClient()
  const savedEntries: Array<{ id: string; type: string; platform?: string; day: string }> = []
  const baseDate = new Date()

  // Save social entries to content_queue
  for (const entry of calendar.entries) {
    if (entry.type === 'social') {
      const socialEntry = entry as AutopilotCalendarEntry
      const publishDate = getNextWeekday(socialEntry.day, baseDate)
      const timeParts = (socialEntry.best_post_time || '08:00').split(':')
      publishDate.setHours(parseInt(timeParts[0]) || 8, parseInt(timeParts[1]) || 0, 0, 0)

      const { data: queueItem, error: insertError } = await supabase
        .from('content_queue')
        .insert({
          organization_id: orgId,
          content: socialEntry.content,
          platform: socialEntry.platform,
          hashtags: socialEntry.hashtags || [],
          status: 'pending_approval',
          publish_at: publishDate.toISOString(),
          source: 'autopilot',
          calendar_week: calendarWeek,
          calendar_year: calendarYear,
          agent_session_id: result.sessionId,
          layout_data: {
            type: 'social',
            image_prompt: socialEntry.image_prompt,
            cta: socialEntry.cta,
            seo_keywords_used: socialEntry.seo_keywords_used,
            content_pillar: socialEntry.content_pillar,
            best_post_time: socialEntry.best_post_time,
          },
          created_by: userOrg.userId,
        })
        .select('id')
        .single()

      if (!insertError && queueItem) {
        savedEntries.push({ id: queueItem.id, type: 'social', platform: socialEntry.platform, day: socialEntry.day })
      }
    } else if (entry.type === 'email') {
      const emailEntry = entry as AutopilotEmailEntry

      // Create draft campaign in email_campaigns
      const { data: campaign, error: campaignError } = await supabase
        .from('email_campaigns')
        .insert({
          organization_id: orgId,
          name: emailEntry.name,
          subject: emailEntry.subject_lines[0] || 'Untitled Campaign',
          preview_text: emailEntry.preview_text,
          html_content: wrapEmailHtml(emailEntry.long_body, profile.business_name),
          text_content: emailEntry.long_body,
          status: 'draft',
          segment_rules: {
            subscription_tier: emailEntry.segment_suggestion?.subscription_tier || [],
            tags: emailEntry.segment_suggestion?.tags || [],
          },
          created_by: userOrg.userId,
        })
        .select('id')
        .single()

      if (!campaignError && campaign) {
        // Also create a reference row in content_queue so it appears in the calendar grid
        const publishDate = getNextWeekday(emailEntry.day, baseDate)
        const timeParts = (profile.email_send_time || '09:00').split(':')
        publishDate.setHours(parseInt(timeParts[0]) || 9, parseInt(timeParts[1]) || 0, 0, 0)

        const { data: queueRef } = await supabase
          .from('content_queue')
          .insert({
            organization_id: orgId,
            content: `Email: ${emailEntry.name} - ${emailEntry.subject_lines[0] || ''}`,
            platform: 'email',
            status: 'pending_approval',
            publish_at: publishDate.toISOString(),
            source: 'autopilot',
            calendar_week: calendarWeek,
            calendar_year: calendarYear,
            agent_session_id: result.sessionId,
            layout_data: {
              type: 'email',
              campaign_id: campaign.id,
              goal: emailEntry.goal,
              subject_lines: emailEntry.subject_lines,
              preview_text: emailEntry.preview_text,
              short_body: emailEntry.short_body,
              long_body: emailEntry.long_body,
              cta: emailEntry.cta,
              cta_url_placeholder: emailEntry.cta_url_placeholder,
              segment_suggestion: emailEntry.segment_suggestion,
              content_pillar: emailEntry.content_pillar,
              follow_up_suggestion: emailEntry.follow_up_suggestion,
            },
            created_by: userOrg.userId,
          })
          .select('id')
          .single()

        if (queueRef) {
          savedEntries.push({ id: queueRef.id, type: 'email', day: emailEntry.day })
        }
      }
    }
  }

  // Update usage and last generated
  await incrementUsage(orgId, 'agent_invocations')
  await updateCalendarGenerated(orgId, week)

  return NextResponse.json({
    calendar: {
      week: calendar.week,
      theme: calendar.theme,
      notes: calendar.notes,
      entry_count: calendar.entries.length,
    },
    saved: savedEntries,
    session_id: result.sessionId,
    tokens_used: result.tokensUsed,
  })
}

export async function GET() {
  const { data: userOrg, error: authError } = await getUserOrg()
  if (!userOrg) {
    return NextResponse.json({ error: authError || 'Not authenticated' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Get query params would require NextRequest but GET has no request param in this signature
  // Return current week's calendar entries
  const currentWeek = getISOWeek(new Date())
  const [yearStr, weekStr] = currentWeek.replace('W', '').split('-')

  const { data: entries, error } = await supabase
    .from('content_queue')
    .select('*')
    .eq('organization_id', userOrg.organizationId)
    .eq('source', 'autopilot')
    .eq('calendar_year', parseInt(yearStr))
    .eq('calendar_week', parseInt(weekStr))
    .order('publish_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch calendar entries' }, { status: 500 })
  }

  return NextResponse.json({ week: currentWeek, entries: entries || [] })
}
