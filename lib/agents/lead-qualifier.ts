/**
 * Lead Qualifier Agent
 * Analyzes business issues, scores leads, recommends tiers
 */

import { BaseAgent } from './base-agent'
import type {
  AgentRunOptions,
  AgentRunResult,
  QualificationResult,
  QualificationScore,
} from './types'

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const LEAD_QUALIFIER_PROMPT = `You are DraggonnB's Lead Qualification AI. Your job is to analyze a prospective client's business challenges and determine:

1. **Fit Score (1-10)**: How well does this business match our ideal customer profile?
   - We serve South African SMEs (1-200 employees)
   - Best fit: businesses with active marketing/sales needs, digital presence, and repeatable processes
   - Industries we serve well: retail, ecommerce, real estate, financial services, hospitality, marketing agencies, professional services
   - Lower fit: very early startups with no revenue, pure offline businesses, government/NGO

2. **Urgency Score (1-10)**: How urgently do they need a solution?
   - High urgency indicators: "losing customers", "can't keep up", "spending too much time", "missing leads", "inconsistent follow-up"
   - Medium urgency: "want to improve", "looking to grow", "exploring options"
   - Low urgency: vague goals, no specific pain points, "just curious"

3. **Size Score (1-10)**: What's the potential deal size?
   - Based on company size, industry, and complexity of needs
   - 1-5 employees = 3-5, 6-20 = 5-7, 21-50 = 6-8, 51-200 = 7-9, 200+ = 8-10
   - Adjust up for industries with higher budgets (financial services, real estate)
   - Adjust down for price-sensitive industries

4. **Recommended Tier**: Based on their needs, recommend one of:
   - **core** (R1,500/mo): Simple needs, 1 automation, basic CRM and email
   - **growth** (R3,500/mo): Multiple automations, AI content, advanced email, lead pipeline
   - **scale** (R7,500/mo): White label, AI agents, unlimited everything, custom integrations

5. **Automatable Processes**: List specific processes from their challenges that we can automate

6. **Suggested Templates**: Match their needs to our template library:
   - "invoice_followup" - Invoice follow-up reminders
   - "lead_autoresponse" - Lead response auto-reply
   - "appointment_booking" - Appointment booking confirmation
   - "social_calendar" - Social content calendar
   - "feedback_collection" - Customer feedback collection
   - "weekly_report" - Weekly report generation
   - "onboarding_drip" - New customer onboarding drip
   - "reengagement" - Re-engagement campaign

IMPORTANT: Respond ONLY with a JSON object in this exact format (no markdown, no code fences):
{
  "score": { "fit": <number>, "urgency": <number>, "size": <number>, "overall": <number> },
  "recommended_tier": "<core|growth|scale>",
  "automatable_processes": ["<process1>", "<process2>", ...],
  "qualification_status": "<qualified|disqualified>",
  "reasoning": "<1-2 paragraph explanation>",
  "suggested_templates": ["<template_id1>", "<template_id2>", ...]
}

A lead is "qualified" if the overall score is >= 4. The overall score is: (fit * 0.4) + (urgency * 0.35) + (size * 0.25).

Be realistic but optimistic. Most SA SMEs with genuine pain points are qualified leads.`

// ============================================================================
// AGENT
// ============================================================================

export class LeadQualifierAgent extends BaseAgent {
  constructor() {
    super({
      agentType: 'lead_qualifier',
      systemPrompt: LEAD_QUALIFIER_PROMPT,
      temperature: 0.3, // Lower temperature for more consistent scoring
      maxTokens: 2048,
    })
  }

  /**
   * Qualify a lead based on their business information
   */
  async qualifyLead(lead: {
    id: string
    company_name: string
    contact_name?: string
    email: string
    website?: string
    industry?: string
    company_size?: string
    business_issues: string[]
  }): Promise<AgentRunResult> {
    const input = `Please qualify this lead:

Company: ${lead.company_name}
Contact: ${lead.contact_name || 'Not provided'}
Email: ${lead.email}
Website: ${lead.website || 'Not provided'}
Industry: ${lead.industry || 'Not specified'}
Company Size: ${lead.company_size || 'Not specified'}

Business Challenges:
1. ${lead.business_issues[0] || 'Not provided'}
2. ${lead.business_issues[1] || 'Not provided'}
3. ${lead.business_issues[2] || 'Not provided'}`

    return this.run({
      leadId: lead.id,
      input,
    })
  }

  protected parseResponse(response: string): QualificationResult {
    // Strip any markdown code fences if present
    let cleaned = response.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const parsed = JSON.parse(cleaned)

    // Validate required fields
    if (!parsed.score || !parsed.recommended_tier || !parsed.qualification_status) {
      throw new Error('Missing required fields in qualification response')
    }

    // Validate score ranges
    const score: QualificationScore = {
      fit: Math.min(10, Math.max(1, Number(parsed.score.fit))),
      urgency: Math.min(10, Math.max(1, Number(parsed.score.urgency))),
      size: Math.min(10, Math.max(1, Number(parsed.score.size))),
      overall: Number(parsed.score.overall),
    }

    // Recalculate overall to ensure consistency
    score.overall = Math.round(
      (score.fit * 0.4 + score.urgency * 0.35 + score.size * 0.25) * 10
    ) / 10

    return {
      score,
      recommended_tier: parsed.recommended_tier,
      automatable_processes: parsed.automatable_processes || [],
      qualification_status: score.overall >= 4 ? 'qualified' : 'disqualified',
      reasoning: parsed.reasoning || '',
      suggested_templates: parsed.suggested_templates || [],
    }
  }
}
