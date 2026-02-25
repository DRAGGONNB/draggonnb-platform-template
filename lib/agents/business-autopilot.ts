/**
 * Business Autopilot Agent
 * Generates weekly content calendars (social + email) based on client profile context.
 * Extends BaseAgent with structured JSON output parsing.
 */

import { BaseAgent } from './base-agent'
import type {
  AutopilotCalendar,
  AutopilotCapability,
} from './types'
import { PLATFORM_GUIDELINES, SOCIAL_GOAL_CONTEXT } from '@/lib/content-studio/social-templates'
import { EMAIL_GOAL_PROMPTS } from '@/lib/content-studio/email-templates'
import type { ClientProfile } from '@/lib/autopilot/client-profile'

function buildSystemPrompt(profile: ClientProfile): string {
  const platformGuides = profile.preferred_platforms
    .map((p) => PLATFORM_GUIDELINES[p] || '')
    .filter(Boolean)
    .join('\n\n')

  const socialGoals = Object.entries(SOCIAL_GOAL_CONTEXT)
    .map(([goal, desc]) => `- ${goal}: ${desc}`)
    .join('\n')

  const emailGoals = Object.entries(EMAIL_GOAL_PROMPTS)
    .map(([goal, desc]) => `- ${goal}: ${desc}`)
    .join('\n')

  return `You are the Business Autopilot for ${profile.business_name}, a ${profile.industry} company.

## Client Brief
- Business: ${profile.business_description || profile.business_name}
- Industry: ${profile.industry}${profile.sub_industry ? ` / ${profile.sub_industry}` : ''}
- Target Market: ${profile.target_market}
- Location: ${profile.location || 'Not specified'}
- Company Size: ${profile.company_size || 'Not specified'}
- Website: ${profile.website || 'Not specified'}
- Tone: ${profile.tone}
- Brand Values: ${profile.brand_values?.join(', ') || 'Not specified'}
- Voice DO: ${profile.brand_do?.join(', ') || 'Not specified'}
- Voice DON'T: ${profile.brand_dont?.join(', ') || 'Not specified'}
- Tagline: ${profile.tagline || 'Not specified'}
- USPs: ${profile.unique_selling_points?.join(', ') || 'Not specified'}
- Content Pillars: ${profile.content_pillars?.join(', ') || 'Not specified'}
- SEO Keywords: ${profile.seo_keywords?.join(', ') || 'Not specified'}
- Competitors: ${profile.competitor_names?.join(', ') || 'Not specified'}

## Platform Guidelines
${platformGuides}

## Social Goals Reference
${socialGoals}

## Email Campaign Guidelines
${emailGoals}

## Preferred Email Goals: ${profile.preferred_email_goals?.join(', ') || 'newsletter, promotion'}
## Email Campaigns Per Week: ${profile.email_campaigns_per_week ?? 1}
## Preferred Email Send Day: ${profile.email_send_day || 'tuesday'}

## Scheduling Preferences
- Platforms: ${profile.preferred_platforms?.join(', ') || 'linkedin, facebook'}
- Posts per platform per week: ${JSON.stringify(profile.posting_frequency || {})}
- Preferred times: ${JSON.stringify(profile.preferred_post_times || {})}
- Timezone: ${profile.timezone || 'Africa/Johannesburg'}

## Your Capabilities
1. GENERATE_CALENDAR: Create a week's content calendar with social posts and email campaign drafts
2. GENERATE_EMAIL_CAMPAIGN: Create a targeted email campaign draft
3. REFINE_POST: Edit a specific post or email based on feedback
4. SCORE_LEAD: Score a potential lead against the target market
5. SUGGEST_CAMPAIGN: Propose a marketing campaign

## Output Format
Always respond with valid JSON only. No markdown formatting, no code blocks, just raw JSON.
For GENERATE_CALENDAR, use this exact structure:
{
  "week": "2026-W09",
  "theme": "Weekly theme description",
  "notes": "Your reasoning and suggestions",
  "entries": [
    {
      "type": "social",
      "day": "monday",
      "platform": "linkedin",
      "content": "Post text here",
      "hashtags": ["tag1", "tag2"],
      "image_prompt": "Description for image generation",
      "cta": "Call to action text",
      "seo_keywords_used": ["keyword1"],
      "content_pillar": "pillar name",
      "best_post_time": "08:00"
    },
    {
      "type": "email",
      "day": "tuesday",
      "goal": "newsletter",
      "name": "Campaign Name",
      "subject_lines": ["Subject 1", "Subject 2", "Subject 3"],
      "preview_text": "Preview text for inbox",
      "short_body": "2-3 paragraph version",
      "long_body": "4-6 paragraph version with sections",
      "cta": "Primary CTA text",
      "cta_url_placeholder": "{{website}}/page",
      "segment_suggestion": {
        "description": "Who should receive this",
        "subscription_tier": ["core", "growth"],
        "tags": []
      },
      "content_pillar": "pillar name",
      "follow_up_suggestion": "Follow-up timing and topic"
    }
  ]
}`
}

function buildCalendarPrompt(week: string, profile: ClientProfile): string {
  const totalSocialPosts = Object.values(profile.posting_frequency || {})
    .reduce((sum: number, count: unknown) => sum + (typeof count === 'number' ? count : 0), 0)
  const emailCount = profile.email_campaigns_per_week ?? 1

  return `GENERATE_CALENDAR for week ${week}.

Requirements:
- Generate ${totalSocialPosts} social media posts spread across the week for platforms: ${profile.preferred_platforms?.join(', ')}
- Generate ${emailCount} email campaign draft(s) using preferred goals: ${profile.preferred_email_goals?.join(', ')}
- Each post should map to a content pillar: ${profile.content_pillars?.join(', ') || 'general business topics'}
- Incorporate SEO keywords naturally: ${profile.seo_keywords?.join(', ') || 'none specified'}
- Maintain the ${profile.tone} tone throughout
- Vary content types: educational, promotional, community, storytelling
- Email campaigns should have compelling subject lines (provide 3-5 options each)
- Email body should include both short (2-3 paragraphs) and long (4-6 paragraphs) versions

Respond with the calendar JSON only.`
}

export class BusinessAutopilotAgent extends BaseAgent {
  private profile: ClientProfile

  constructor(profile: ClientProfile) {
    super({
      agentType: 'business_autopilot',
      systemPrompt: buildSystemPrompt(profile),
      maxTokens: 8192,
      temperature: 0.8,
    })
    this.profile = profile
  }

  async generateCalendar(week: string, organizationId: string) {
    const input = buildCalendarPrompt(week, this.profile)
    return this.run({ organizationId, input })
  }

  async refinePost(
    postContent: string,
    feedback: string,
    organizationId: string,
    sessionId?: string
  ) {
    const input = `REFINE_POST

Current content:
${postContent}

User feedback:
${feedback}

Return the refined content in the same JSON structure as the original entry (either social or email type).`

    return this.run({ organizationId, sessionId, input })
  }

  async chat(message: string, organizationId: string, sessionId?: string) {
    return this.run({ organizationId, sessionId, input: message })
  }

  protected parseResponse(response: string): AutopilotCalendar | Record<string, unknown> {
    // Strip markdown code blocks if present
    let cleaned = response.trim()
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7)
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3)
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3)
    }
    cleaned = cleaned.trim()

    try {
      const parsed = JSON.parse(cleaned)

      // If it looks like a calendar response, validate structure
      if (parsed.week && Array.isArray(parsed.entries)) {
        return parsed as AutopilotCalendar
      }

      return parsed as Record<string, unknown>
    } catch {
      return { raw: response }
    }
  }
}

export { buildCalendarPrompt, buildSystemPrompt }
export type { AutopilotCapability }
