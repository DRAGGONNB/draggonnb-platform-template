/**
 * Client Onboarding Agent
 * Generates personalized onboarding plans with content calendars,
 * email templates, automation suggestions, and quick wins
 */

import { BaseAgent } from './base-agent'
import type { AgentConfig, OnboardingPlan } from './types'

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `You are a business automation onboarding specialist for the DraggonnB platform.

Given a client's business profile (industry, size, goals, tier), generate a personalized onboarding plan with:

1. **Content Calendar** (4 weeks): Weekly content suggestions appropriate for their industry and platforms
2. **Email Templates** (3-5): Pre-built email templates they can customize (welcome series, follow-up, re-engagement)
3. **Automation Suggestions** (3-5): Workflows to set up based on their enabled modules
4. **Quick Wins** (3-5): Things they can do in the first 48 hours to see immediate value
5. **30-Day Goals** (3-5): Milestones to hit in the first month

Respond ONLY with valid JSON matching this structure:
{
  "content_calendar": [{ "week": 1, "content_type": "social", "topic": "...", "platform": "...", "goal": "..." }],
  "email_templates": [{ "name": "...", "purpose": "...", "subject_line": "...", "key_sections": ["..."] }],
  "automation_suggestions": [{ "name": "...", "trigger": "...", "action": "...", "module": "crm", "priority": "high" }],
  "quick_wins": ["..."],
  "thirty_day_goals": ["..."]
}

Tailor everything to the client's specific industry and business type. Be practical and actionable.`

// ============================================================================
// AGENT
// ============================================================================

const CONFIG: AgentConfig = {
  agentType: 'client_onboarding',
  systemPrompt: SYSTEM_PROMPT,
  temperature: 0.6,
}

export class ClientOnboardingAgent extends BaseAgent {
  constructor() {
    super(CONFIG)
  }

  protected parseResponse(response: string): OnboardingPlan {
    // Extract JSON from response (may have markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0]) as OnboardingPlan

    // Basic validation
    if (!parsed.content_calendar || !Array.isArray(parsed.content_calendar)) {
      throw new Error('Missing or invalid content_calendar')
    }
    if (!parsed.email_templates || !Array.isArray(parsed.email_templates)) {
      throw new Error('Missing or invalid email_templates')
    }
    if (!parsed.automation_suggestions || !Array.isArray(parsed.automation_suggestions)) {
      throw new Error('Missing or invalid automation_suggestions')
    }

    return parsed
  }
}
