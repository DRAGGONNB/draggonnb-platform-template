/**
 * Proposal Generator Agent
 * Takes qualification output and generates a concrete business proposal
 */

import { BaseAgent } from './base-agent'
import type {
  AgentRunOptions,
  AgentRunResult,
  QualificationResult,
  Proposal,
} from './types'

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const PROPOSAL_GENERATOR_PROMPT = `You are DraggonnB's Proposal Generator. Given a qualified lead's business challenges and qualification data, you generate a compelling, concrete business proposal.

Our platform DraggonnB CRMM offers AI-powered business automation for South African SMEs. Pricing is in South African Rand (ZAR).

**Tiers:**
- Core (R1,500/mo): Social CRM, email management, 1 custom automation, 30 social posts/mo, 50 AI generations, 1,000 emails/mo
- Growth (R3,500/mo): 3+ automations, AI content gen, advanced email (A/B, behavioral triggers), smart lead pipeline, 100 posts/mo, 200 AI gen, 10,000 emails/mo
- Scale (R7,500/mo): White label, AI agents (support bot, lead responder, content autopilot), unlimited everything, API access, 3 AI agents

**Available Automation Templates:**
1. Invoice Follow-up Reminder - Automated invoice reminders at 7, 14, 30 days
2. Lead Response Auto-reply - Instant AI response to new leads within 5 minutes
3. Appointment Booking Confirmation - Automated confirmations and reminders
4. Social Content Calendar - Monthly AI-generated social content plan
5. Customer Feedback Collection - Automated NPS/satisfaction surveys post-delivery
6. Weekly Report Generation - AI-compiled business performance reports
7. New Customer Onboarding Drip - 7-email onboarding sequence for new clients
8. Re-engagement Campaign - Win-back campaigns for inactive customers

For each pain point, match a specific automation and estimate savings. Be specific and quantitative where possible (e.g., "Save 5 hours/week on manual follow-ups" rather than "Save time").

South African business context: reference ZAR, local working hours (SAST), common SA business challenges (load shedding backup comms, EFT payment follow-ups, WhatsApp as primary communication channel).

IMPORTANT: Respond ONLY with a JSON object in this exact format (no markdown, no code fences):
{
  "executive_summary": "<2-3 sentence summary of the proposal>",
  "recommended_tier": "<core|growth|scale>",
  "monthly_price": <number in ZAR>,
  "sections": [
    {
      "pain_point": "<the specific business challenge>",
      "automation_solution": "<how DraggonnB solves it>",
      "template_name": "<matching template name or null>",
      "expected_time_savings": "<e.g., '5 hours/week'>",
      "expected_cost_savings": "<e.g., 'R3,000/month'>"
    }
  ],
  "implementation_timeline": "<e.g., '72 hours for core setup, 1 week for full optimization'>",
  "total_estimated_savings": "<e.g., 'R8,000-R12,000/month in time and operational costs'>",
  "next_steps": ["<step1>", "<step2>", "<step3>"]
}`

// ============================================================================
// AGENT
// ============================================================================

export class ProposalGeneratorAgent extends BaseAgent {
  constructor() {
    super({
      agentType: 'proposal_generator',
      systemPrompt: PROPOSAL_GENERATOR_PROMPT,
      temperature: 0.5,
      maxTokens: 3000,
    })
  }

  /**
   * Generate a proposal for a qualified lead
   */
  async generateProposal(
    lead: {
      id: string
      company_name: string
      contact_name?: string
      industry?: string
      company_size?: string
      business_issues: string[]
    },
    qualification: QualificationResult
  ): Promise<AgentRunResult> {
    const input = `Generate a business proposal for this qualified lead:

**Company:** ${lead.company_name}
**Contact:** ${lead.contact_name || 'Business Owner'}
**Industry:** ${lead.industry || 'General'}
**Company Size:** ${lead.company_size || 'SME'}

**Business Challenges:**
1. ${lead.business_issues[0] || 'Not specified'}
2. ${lead.business_issues[1] || 'Not specified'}
3. ${lead.business_issues[2] || 'Not specified'}

**Qualification Results:**
- Fit Score: ${qualification.score.fit}/10
- Urgency Score: ${qualification.score.urgency}/10
- Size Score: ${qualification.score.size}/10
- Overall Score: ${qualification.score.overall}/10
- Recommended Tier: ${qualification.recommended_tier}
- Automatable Processes: ${qualification.automatable_processes.join(', ')}
- Suggested Templates: ${qualification.suggested_templates.join(', ')}
- Reasoning: ${qualification.reasoning}

Generate a compelling proposal that directly addresses each pain point with a specific DraggonnB automation solution.`

    return this.run({
      leadId: lead.id,
      input,
    })
  }

  protected parseResponse(response: string): Proposal {
    // Strip any markdown code fences if present
    let cleaned = response.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const parsed = JSON.parse(cleaned)

    // Validate required fields
    if (!parsed.executive_summary || !parsed.recommended_tier || !parsed.sections) {
      throw new Error('Missing required fields in proposal response')
    }

    // Map tier to price
    const tierPrices: Record<string, number> = {
      core: 1500,
      growth: 3500,
      scale: 7500,
    }

    return {
      executive_summary: parsed.executive_summary,
      recommended_tier: parsed.recommended_tier,
      monthly_price: tierPrices[parsed.recommended_tier] || parsed.monthly_price,
      sections: parsed.sections.map((s: Record<string, string>) => ({
        pain_point: s.pain_point,
        automation_solution: s.automation_solution,
        template_name: s.template_name || null,
        expected_time_savings: s.expected_time_savings || 'TBD',
        expected_cost_savings: s.expected_cost_savings || 'TBD',
      })),
      implementation_timeline: parsed.implementation_timeline || '72 hours',
      total_estimated_savings: parsed.total_estimated_savings || 'Significant',
      next_steps: parsed.next_steps || [
        'Review this proposal',
        'Select your plan',
        'Your AI-powered solution goes live within 72 hours',
      ],
    }
  }
}
