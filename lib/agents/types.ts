/**
 * AI Agent Types
 * TypeScript interfaces for the agent system
 */

// ============================================================================
// AGENT TYPES
// ============================================================================

export type AgentType =
  | 'lead_qualifier'
  | 'proposal_generator'
  | 'email_composer'
  | 'social_responder'
  | 'customer_support'
  | 'content_autopilot'
  | 'business_autopilot'
  | 'client_onboarding'

export type AgentStatus = 'active' | 'completed' | 'failed'

// ============================================================================
// MESSAGES
// ============================================================================

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  tokens?: number
}

// ============================================================================
// SESSION
// ============================================================================

export interface AgentSession {
  id: string
  organization_id?: string
  agent_type: AgentType
  lead_id?: string
  messages: AgentMessage[]
  tokens_used: number
  status: AgentStatus
  result?: unknown
  created_at: string
  updated_at: string
}

// ============================================================================
// BASE AGENT CONFIG
// ============================================================================

export interface AgentConfig {
  agentType: AgentType
  systemPrompt: string
  model?: string
  maxTokens?: number
  temperature?: number
  tools?: AgentTool[]
}

export interface AgentTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

// ============================================================================
// AGENT EXECUTION
// ============================================================================

export interface AgentRunOptions {
  organizationId?: string
  leadId?: string
  sessionId?: string
  input: string
  context?: Record<string, unknown>
}

export interface AgentRunResult {
  sessionId: string
  response: string
  tokensUsed: number
  result?: unknown
  status: AgentStatus
}

// ============================================================================
// LEAD QUALIFICATION
// ============================================================================

export interface QualificationScore {
  fit: number       // 1-10: how well the lead matches our ICP
  urgency: number   // 1-10: how urgently they need a solution
  size: number      // 1-10: potential deal size / company revenue
  overall: number   // weighted average
}

export interface QualificationResult {
  score: QualificationScore
  recommended_tier: 'core' | 'growth' | 'scale'
  automatable_processes: string[]
  qualification_status: 'qualified' | 'disqualified'
  reasoning: string
  suggested_templates: string[]
}

// ============================================================================
// PROPOSAL GENERATION
// ============================================================================

export interface ProposalSection {
  pain_point: string
  automation_solution: string
  template_name?: string
  expected_time_savings: string
  expected_cost_savings: string
}

export interface Proposal {
  executive_summary: string
  recommended_tier: 'core' | 'growth' | 'scale'
  monthly_price: number
  sections: ProposalSection[]
  implementation_timeline: string
  total_estimated_savings: string
  next_steps: string[]
}

// ============================================================================
// CLIENT ONBOARDING
// ============================================================================

export interface ContentCalendarEntry {
  week: number
  content_type: 'blog' | 'social' | 'email' | 'ad'
  topic: string
  platform: string
  goal: string
}

export interface EmailTemplateSpec {
  name: string
  purpose: string
  subject_line: string
  key_sections: string[]
}

export interface AutomationSuggestion {
  name: string
  trigger: string
  action: string
  module: string
  priority: 'high' | 'medium' | 'low'
}

export interface OnboardingPlan {
  content_calendar: ContentCalendarEntry[]
  email_templates: EmailTemplateSpec[]
  automation_suggestions: AutomationSuggestion[]
  quick_wins: string[]
  thirty_day_goals: string[]
}

// ============================================================================
// BUSINESS AUTOPILOT
// ============================================================================

export interface AutopilotCalendarEntry {
  type: 'social'
  day: string
  platform: string
  content: string
  hashtags: string[]
  image_prompt: string
  cta: string
  seo_keywords_used: string[]
  content_pillar: string
  best_post_time: string
}

export interface AutopilotEmailEntry {
  type: 'email'
  day: string
  goal: string
  name: string
  subject_lines: string[]
  preview_text: string
  short_body: string
  long_body: string
  cta: string
  cta_url_placeholder: string
  segment_suggestion: {
    description: string
    subscription_tier?: string[]
    tags?: string[]
  }
  content_pillar: string
  follow_up_suggestion: string
}

export type AutopilotEntry = AutopilotCalendarEntry | AutopilotEmailEntry

export interface AutopilotCalendar {
  week: string
  entries: AutopilotEntry[]
  theme: string
  notes: string
}

export type AutopilotCapability =
  | 'GENERATE_CALENDAR'
  | 'GENERATE_EMAIL_CAMPAIGN'
  | 'REFINE_POST'
  | 'SCORE_LEAD'
  | 'SUGGEST_CAMPAIGN'
