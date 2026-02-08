/**
 * Email Automation Types
 * TypeScript interfaces for email marketing system
 */

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export interface EmailTemplate {
  id: string
  organization_id: string
  name: string
  subject: string
  description?: string
  html_content: string
  text_content?: string
  editor_json?: EditorJSON
  variables: string[]
  category: TemplateCategory
  thumbnail_url?: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export type TemplateCategory = 'welcome' | 'newsletter' | 'promotional' | 'transactional' | 'general'

export interface EditorJSON {
  body: EditorBlock[]
  design?: Record<string, unknown>
}

export interface EditorBlock {
  type: string
  data: Record<string, unknown>
}

export interface CreateTemplateRequest {
  name: string
  subject: string
  description?: string
  html_content: string
  text_content?: string
  editor_json?: EditorJSON
  variables?: string[]
  category?: TemplateCategory
}

// ============================================================================
// EMAIL CAMPAIGNS
// ============================================================================

export interface EmailCampaign {
  id: string
  organization_id: string
  name: string
  subject: string
  preview_text?: string
  template_id?: string
  html_content?: string
  text_content?: string
  status: CampaignStatus
  segment_rules: SegmentRules
  recipient_count: number
  scheduled_for?: string
  started_at?: string
  completed_at?: string
  stats: CampaignStats
  created_by?: string
  created_at: string
  updated_at: string
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled'

export interface SegmentRules {
  subscription_tier?: string[]
  tags?: string[]
  signup_after?: string
  signup_before?: string
  last_active_after?: string
  last_active_before?: string
  custom?: Record<string, unknown>
}

export interface CampaignStats {
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  unsubscribed: number
}

export interface CreateCampaignRequest {
  name: string
  subject: string
  preview_text?: string
  template_id?: string
  html_content?: string
  segment_rules?: SegmentRules
  scheduled_for?: string
}

// ============================================================================
// EMAIL SEQUENCES
// ============================================================================

export interface EmailSequence {
  id: string
  organization_id: string
  name: string
  description?: string
  trigger_type: SequenceTriggerType
  trigger_rules: TriggerRules
  is_active: boolean
  allow_reenroll: boolean
  exit_on_reply: boolean
  total_enrolled: number
  total_completed: number
  created_by?: string
  created_at: string
  updated_at: string
  steps?: SequenceStep[]
}

export type SequenceTriggerType = 'signup' | 'subscription_change' | 'tag_added' | 'inactivity' | 'custom_event' | 'manual'

export interface TriggerRules {
  subscription_tier?: string
  days_inactive?: number
  tag?: string
  event_name?: string
  custom?: Record<string, unknown>
}

export interface SequenceStep {
  id: string
  sequence_id: string
  step_order: number
  step_type: StepType
  template_id?: string
  subject_override?: string
  delay_days: number
  delay_hours: number
  delay_minutes: number
  conditions: StepConditions
  stats: StepStats
  created_at: string
  updated_at: string
}

export type StepType = 'email' | 'wait' | 'condition' | 'action'

export interface StepConditions {
  if_not_opened_previous?: boolean
  if_clicked_link?: string
  if_opened_previous?: boolean
  custom?: Record<string, unknown>
}

export interface StepStats {
  sent: number
  opened: number
  clicked: number
}

export interface CreateSequenceRequest {
  name: string
  description?: string
  trigger_type: SequenceTriggerType
  trigger_rules?: TriggerRules
  steps?: CreateStepRequest[]
}

export interface CreateStepRequest {
  step_order: number
  step_type: StepType
  template_id?: string
  subject_override?: string
  delay_days?: number
  delay_hours?: number
  delay_minutes?: number
  conditions?: StepConditions
}

// ============================================================================
// EMAIL SENDS
// ============================================================================

export interface EmailSend {
  id: string
  organization_id: string
  campaign_id?: string
  sequence_id?: string
  sequence_step_id?: string
  recipient_email: string
  recipient_name?: string
  recipient_user_id?: string
  subject: string
  from_email: string
  from_name?: string
  status: EmailSendStatus
  queued_at: string
  sent_at?: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
  bounced_at?: string
  failed_at?: string
  provider: string
  provider_message_id?: string
  provider_response?: Record<string, unknown>
  error_message?: string
  error_code?: string
  open_count: number
  click_count: number
  clicked_links: string[]
  metadata: Record<string, unknown>
  created_at: string
}

export type EmailSendStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'complained'
  | 'unsubscribed'
  | 'failed'

// ============================================================================
// SEQUENCE ENROLLMENTS
// ============================================================================

export interface SequenceEnrollment {
  id: string
  organization_id: string
  sequence_id: string
  contact_email: string
  contact_user_id?: string
  current_step: number
  status: EnrollmentStatus
  enrolled_at: string
  last_step_at?: string
  next_step_at?: string
  completed_at?: string
  exited_at?: string
  exit_reason?: string
  metadata: Record<string, unknown>
}

export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'exited' | 'failed'

// ============================================================================
// OUTREACH RULES
// ============================================================================

export interface OutreachRule {
  id: string
  organization_id?: string
  name: string
  description?: string
  subscription_tiers: string[]
  service_types?: string[]
  trigger_event: OutreachTriggerEvent
  trigger_conditions: Record<string, unknown>
  action_type: OutreachActionType
  sequence_id?: string
  template_id?: string
  webhook_url?: string
  is_active: boolean
  priority: number
  cooldown_hours: number
  times_triggered: number
  last_triggered_at?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export type OutreachTriggerEvent =
  | 'new_signup'
  | 'subscription_upgrade'
  | 'subscription_downgrade'
  | 'inactivity_7d'
  | 'inactivity_30d'
  | 'usage_limit_80'
  | 'usage_limit_100'
  | 'trial_ending'
  | 'payment_failed'
  | 'custom'

export type OutreachActionType = 'sequence' | 'single_email' | 'notification' | 'webhook'

export interface CreateOutreachRuleRequest {
  name: string
  description?: string
  subscription_tiers?: string[]
  service_types?: string[]
  trigger_event: OutreachTriggerEvent
  trigger_conditions?: Record<string, unknown>
  action_type: OutreachActionType
  sequence_id?: string
  template_id?: string
  webhook_url?: string
  priority?: number
  cooldown_hours?: number
}

// ============================================================================
// EMAIL PROVIDER
// ============================================================================

export interface SendEmailRequest {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  fromName?: string
  replyTo?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface SendEmailResponse {
  success: boolean
  messageId?: string
  error?: string
}

export interface EmailProviderConfig {
  apiKey: string
  defaultFrom: string
  defaultFromName?: string
  replyTo?: string
}

// ============================================================================
// EMAIL ANALYTICS
// ============================================================================

export interface EmailAnalytics {
  period: 'day' | 'week' | 'month'
  start_date: string
  end_date: string
  totals: AnalyticsTotals
  daily: DailyAnalytics[]
  top_campaigns: CampaignPerformance[]
  top_templates: TemplatePerformance[]
}

export interface AnalyticsTotals {
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  unsubscribed: number
  open_rate: number
  click_rate: number
  bounce_rate: number
}

export interface DailyAnalytics {
  date: string
  sent: number
  opened: number
  clicked: number
  bounced: number
}

export interface CampaignPerformance {
  campaign_id: string
  campaign_name: string
  sent: number
  open_rate: number
  click_rate: number
}

export interface TemplatePerformance {
  template_id: string
  template_name: string
  times_used: number
  avg_open_rate: number
  avg_click_rate: number
}

// ============================================================================
// TIER LIMITS
// ============================================================================

export interface EmailLimits {
  emails_per_month: number
  templates: number
  campaigns: number
  sequences: number
  ab_testing: boolean
  advanced_analytics: boolean
  api_access: boolean
}

export const TIER_EMAIL_LIMITS: Record<string, EmailLimits> = {
  // Legacy tier names (kept for backwards compatibility)
  starter: {
    emails_per_month: 1000,
    templates: 5,
    campaigns: 2,
    sequences: 1,
    ab_testing: false,
    advanced_analytics: false,
    api_access: false,
  },
  professional: {
    emails_per_month: 10000,
    templates: 25,
    campaigns: 10,
    sequences: 5,
    ab_testing: true,
    advanced_analytics: true,
    api_access: true,
  },
  enterprise: {
    emails_per_month: Infinity,
    templates: Infinity,
    campaigns: Infinity,
    sequences: Infinity,
    ab_testing: true,
    advanced_analytics: true,
    api_access: true,
  },
  // New canonical tier names
  core: {
    emails_per_month: 1000,
    templates: 5,
    campaigns: 2,
    sequences: 1,
    ab_testing: false,
    advanced_analytics: false,
    api_access: false,
  },
  growth: {
    emails_per_month: 10000,
    templates: 25,
    campaigns: 10,
    sequences: 5,
    ab_testing: true,
    advanced_analytics: true,
    api_access: true,
  },
  scale: {
    emails_per_month: Infinity,
    templates: Infinity,
    campaigns: Infinity,
    sequences: Infinity,
    ab_testing: true,
    advanced_analytics: true,
    api_access: true,
  },
}

// ============================================================================
// VARIABLE SUBSTITUTION
// ============================================================================

export interface TemplateVariables {
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
  company_name?: string
  subscription_tier?: string
  unsubscribe_url?: string
  preferences_url?: string
  current_year?: string
  [key: string]: string | undefined
}

export const DEFAULT_VARIABLES: TemplateVariables = {
  current_year: new Date().getFullYear().toString(),
}
