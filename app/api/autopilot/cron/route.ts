import { NextRequest, NextResponse } from 'next/server'
import { getAutopilotEnabledOrgs, getClientProfile } from '@/lib/autopilot/client-profile'
import { BusinessAutopilotAgent } from '@/lib/agents/business-autopilot'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateCalendarGenerated } from '@/lib/autopilot/client-profile'
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
  // Validate internal secret
  const secret = request.headers.get('x-internal-secret')
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgs = await getAutopilotEnabledOrgs()
  if (orgs.length === 0) {
    return NextResponse.json({ message: 'No autopilot-enabled organizations', generated: 0 })
  }

  const week = getISOWeek(new Date())
  const supabase = createAdminClient()
  const results: Array<{ org_id: string; status: string; entries?: number; error?: string }> = []

  for (const org of orgs) {
    const profile = await getClientProfile(org.organization_id)
    if (!profile) {
      results.push({ org_id: org.organization_id, status: 'skipped', error: 'No profile' })
      continue
    }

    // Skip if already generated this week
    if (profile.last_calendar_week === week) {
      results.push({ org_id: org.organization_id, status: 'skipped', error: 'Already generated' })
      continue
    }

    try {
      const agent = new BusinessAutopilotAgent(profile)
      const result = await agent.generateCalendar(week, org.organization_id)
      const calendar = result.result as AutopilotCalendar | null

      if (!calendar?.entries?.length) {
        results.push({ org_id: org.organization_id, status: 'error', error: 'Invalid calendar output' })
        continue
      }

      const [yearStr, weekStr] = week.replace('W', '').split('-')
      const calendarYear = parseInt(yearStr)
      const calendarWeek = parseInt(weekStr)
      const baseDate = new Date()
      let savedCount = 0

      for (const entry of calendar.entries) {
        if (entry.type === 'social') {
          const socialEntry = entry as AutopilotCalendarEntry
          const publishDate = getNextWeekday(socialEntry.day, baseDate)
          const timeParts = (socialEntry.best_post_time || '08:00').split(':')
          publishDate.setHours(parseInt(timeParts[0]) || 8, parseInt(timeParts[1]) || 0, 0, 0)

          const { error: insertError } = await supabase
            .from('content_queue')
            .insert({
              organization_id: org.organization_id,
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
              },
            })

          if (!insertError) savedCount++
        } else if (entry.type === 'email') {
          const emailEntry = entry as AutopilotEmailEntry
          const { data: campaign } = await supabase
            .from('email_campaigns')
            .insert({
              organization_id: org.organization_id,
              name: emailEntry.name,
              subject: emailEntry.subject_lines[0] || 'Untitled',
              preview_text: emailEntry.preview_text,
              html_content: wrapEmailHtml(emailEntry.long_body, profile.business_name),
              text_content: emailEntry.long_body,
              status: 'draft',
              segment_rules: {
                subscription_tier: emailEntry.segment_suggestion?.subscription_tier || [],
                tags: emailEntry.segment_suggestion?.tags || [],
              },
            })
            .select('id')
            .single()

          if (campaign) {
            const publishDate = getNextWeekday(emailEntry.day, baseDate)
            publishDate.setHours(9, 0, 0, 0)

            await supabase.from('content_queue').insert({
              organization_id: org.organization_id,
              content: `Email: ${emailEntry.name}`,
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
              },
            })
            savedCount++
          }
        }
      }

      await updateCalendarGenerated(org.organization_id, week)
      results.push({ org_id: org.organization_id, status: 'success', entries: savedCount })
    } catch (err) {
      console.error(`Cron generation failed for org ${org.organization_id}:`, err)
      results.push({ org_id: org.organization_id, status: 'error', error: String(err) })
    }
  }

  return NextResponse.json({
    week,
    total_orgs: orgs.length,
    results,
  })
}
