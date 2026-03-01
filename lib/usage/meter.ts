import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Event-sourced usage metering for DraggonnB OS.
 *
 * Replaces counter-based metering (client_usage_metrics table) with an
 * append-only event log. Uses a buffer + flush pattern to batch inserts
 * for performance.
 *
 * Dimensions match plan_limits.dimension values:
 * - ai_generations, social_posts, email_sends, agent_invocations, autopilot_runs
 * - whatsapp_utility, whatsapp_marketing (Sprint 3)
 */

export type UsageDimension =
  | 'ai_generations'
  | 'social_posts'
  | 'email_sends'
  | 'agent_invocations'
  | 'autopilot_runs'
  | 'whatsapp_utility'
  | 'whatsapp_marketing'

export type ModuleName = 'crmm' | 'accommodation' | 'vdj' | 'restaurant' | 'events' | 'elijah'

export interface UsageEvent {
  organizationId: string
  dimension: UsageDimension
  quantity: number
  module?: ModuleName
  metadata?: Record<string, unknown>
}

// Buffer for batching inserts
const eventBuffer: UsageEvent[] = []
let flushTimeout: ReturnType<typeof setTimeout> | null = null

const FLUSH_INTERVAL_MS = 1000
const FLUSH_BATCH_SIZE = 50

/**
 * Record a usage event. Non-blocking -- events are buffered and flushed
 * in batches every 1s or when the buffer reaches 50 events.
 */
export function logUsage(event: UsageEvent): void {
  eventBuffer.push(event)

  if (eventBuffer.length >= FLUSH_BATCH_SIZE) {
    flushEvents()
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(flushEvents, FLUSH_INTERVAL_MS)
  }
}

/**
 * Record a usage event immediately (synchronous insert, no buffering).
 * Use for critical paths where the event must be persisted before responding.
 */
export async function logUsageSync(event: UsageEvent): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase.from('usage_events').insert({
    organization_id: event.organizationId,
    dimension: event.dimension,
    quantity: event.quantity,
    module: event.module || null,
    metadata: event.metadata || {},
  })

  if (error) {
    console.error('[Usage Meter] Failed to log event:', error.message, event)
  }
}

/**
 * Flush all buffered events to Supabase.
 * Called automatically by the buffer timer, or manually for graceful shutdown.
 */
export async function flushEvents(): Promise<void> {
  if (flushTimeout) {
    clearTimeout(flushTimeout)
    flushTimeout = null
  }

  const events = eventBuffer.splice(0)
  if (events.length === 0) return

  const supabase = createAdminClient()

  const rows = events.map(e => ({
    organization_id: e.organizationId,
    dimension: e.dimension,
    quantity: e.quantity,
    module: e.module || null,
    metadata: e.metadata || {},
  }))

  const { error } = await supabase.from('usage_events').insert(rows)

  if (error) {
    console.error('[Usage Meter] Batch insert failed:', error.message, `(${rows.length} events lost)`)
    // In production, could push to a dead-letter queue here
  }
}

/**
 * Convenience: log an AI generation event with token counts.
 */
export function logAIGeneration(
  organizationId: string,
  opts: {
    model?: string
    tokensIn?: number
    tokensOut?: number
    module?: ModuleName
  } = {}
): void {
  logUsage({
    organizationId,
    dimension: 'ai_generations',
    quantity: 1,
    module: opts.module,
    metadata: {
      model: opts.model,
      tokens_in: opts.tokensIn,
      tokens_out: opts.tokensOut,
    },
  })
}

/**
 * Convenience: log a social post publish event.
 */
export function logSocialPost(
  organizationId: string,
  opts: {
    platform?: string
    postId?: string
  } = {}
): void {
  logUsage({
    organizationId,
    dimension: 'social_posts',
    quantity: 1,
    module: 'crmm',
    metadata: {
      platform: opts.platform,
      post_id: opts.postId,
    },
  })
}

/**
 * Convenience: log an email send event.
 */
export function logEmailSend(
  organizationId: string,
  quantity: number = 1,
  opts: {
    campaignId?: string
    templateId?: string
  } = {}
): void {
  logUsage({
    organizationId,
    dimension: 'email_sends',
    quantity,
    module: 'crmm',
    metadata: {
      campaign_id: opts.campaignId,
      template_id: opts.templateId,
    },
  })
}

/**
 * Convenience: log a WhatsApp utility (transactional) message event.
 */
export function logWhatsAppUtility(orgId: string, metadata?: Record<string, unknown>) {
  logUsage({ organizationId: orgId, dimension: 'whatsapp_utility', metadata })
}

/**
 * Convenience: log a WhatsApp marketing message event.
 */
export function logWhatsAppMarketing(orgId: string, metadata?: Record<string, unknown>) {
  logUsage({ organizationId: orgId, dimension: 'whatsapp_marketing', metadata })
}
