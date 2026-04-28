/**
 * Base Agent — Thin wrapper around Claude API
 *
 * Phase 09 rewrites (ERR-029 fix + USAGE-07 + USAGE-12):
 * 1. Default model changed from claude-sonnet-4-5-20250929 → claude-haiku-4-5-20251001
 *    (ERR-029: silent Sonnet fallback was draining cost on all 6 production agents)
 * 2. Mandatory cost-ceiling check BEFORE every Anthropic call (CostCeilingExceededError at cap)
 * 3. Full cache-token instrumentation (cache_read_input_tokens, cache_creation_input_tokens)
 * 4. ai_usage_ledger INSERT per call (success, retry, and abort-by-ceiling)
 * 5. agent_sessions UPDATE with cumulative cost columns (migration 25 added these columns)
 * 6. system field widened: accepts string | SystemBlock[] (Phase 10 cache-isolation prep)
 * 7. Tier-based model selection: Sonnet/Opus blocked on core/growth, silently downgraded to Haiku
 */

import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { MODEL_IDS, DEFAULT_MODEL, selectModel } from '@/lib/ai/model-registry'
import { checkCostCeiling, projectCost, CostCeilingExceededError } from '@/lib/ai/cost-ceiling'
import { computeCostZarCents } from '@/lib/ai/cost-calculator'
import { getCanonicalTierName } from '@/lib/payments/payfast'
import { env } from '@/lib/config/env'
import { buildSystemBlocks } from '@/lib/brand-voice/build-system-blocks'
import type { ModelId } from '@/lib/ai/model-registry'
import type {
  AgentConfig,
  AgentRunOptions,
  AgentRunResult,
  AgentMessage,
  AgentStatus,
} from './types'

// ============================================================================
// TYPED AGENT ERRORS (Phase 12 — hotfix A2/A4/A7 / AI error surfacing)
// ============================================================================

/**
 * Thrown when the Anthropic API rejects the call due to insufficient credits.
 * HTTP 401 from Anthropic SDK or error messages matching credit/billing keywords.
 * userMessage is safe to surface directly in UI toasts.
 */
export class AgentCreditError extends Error {
  readonly userMessage = 'AI service is temporarily out of credits — operator has been notified'
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AgentCreditError'
  }
}

/**
 * Thrown when the Anthropic API rejects the call due to rate limiting (HTTP 429).
 * userMessage is safe to surface directly in UI toasts.
 */
export class AgentRateLimitError extends Error {
  readonly userMessage = 'AI service is rate-limited — please retry in a moment'
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AgentRateLimitError'
  }
}

// ============================================================================
// TYPES
// ============================================================================

/** System block for Anthropic prompt caching (Phase 10 cache-isolation prep) */
export type SystemBlock = {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}


// ============================================================================
// CLIENT
// ============================================================================

let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    // env singleton validates ANTHROPIC_API_KEY at boot (OPS-01).
    anthropicClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  }
  return anthropicClient
}

// ============================================================================
// CONSTANTS
// ============================================================================

// ERR-029 FIX: Default model is now Haiku 4.5, NOT Sonnet.
// Sonnet is only allowed for scale/platform_admin tiers (enforced in selectModel).
const DEFAULT_MAX_TOKENS = 4096
const DEFAULT_TEMPERATURE = 0.7

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Rough token estimate from message array: JSON length / 4 chars per token.
 * Used for pre-call ceiling projection only — not for billing.
 */
function estimateInputTokens(messages: Anthropic.MessageParam[]): number {
  return Math.ceil(JSON.stringify(messages).length / 4)
}

// ============================================================================
// BASE AGENT
// ============================================================================

export abstract class BaseAgent {
  protected config: AgentConfig & { model: ModelId }
  /** Lazily loaded brand voice prompt (undefined = not yet loaded; null = no brand voice for this org) */
  private _brandVoiceCached: string | null | undefined = undefined

  constructor(config: AgentConfig) {
    // ERR-029 FIX: explicit model resolution — no implicit Sonnet fallback possible
    const resolvedModel = (config.model as ModelId | undefined) ?? DEFAULT_MODEL
    this.config = {
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      ...config,
      model: resolvedModel, // always Haiku unless subclass explicitly passes a model string
    }
  }

  /**
   * Lazily load the org's brand voice from client_profiles.
   * Caches on the agent instance — a single agent instance that processes multiple requests
   * in the same Node.js request context will only hit the DB once.
   * A fresh agent instance per request (typical for stateless API routes) will fetch once per request.
   */
  private async loadBrandVoice(orgId: string): Promise<string | null> {
    if (this._brandVoiceCached !== undefined) return this._brandVoiceCached
    const supa = createAdminClient()
    const { data } = await supa
      .from('client_profiles')
      .select('brand_voice_prompt')
      .eq('organization_id', orgId)
      .single()
    this._brandVoiceCached = (data as { brand_voice_prompt: string | null } | null)?.brand_voice_prompt ?? null
    return this._brandVoiceCached
  }

  /**
   * Run the agent with the given input.
   *
   * Flow:
   * 1. Load/create agent_sessions row
   * 2. Build message history
   * 3. Resolve effective model (tier-aware downgrade via selectModel)
   * 4. Estimate projected cost → checkCostCeiling (throws CostCeilingExceededError if over limit)
   * 5. Call Anthropic API
   * 6. Compute actual cost from response.usage
   * 7. INSERT ai_usage_ledger row (always — success or abort)
   * 8. UPDATE agent_sessions (cumulative cost + token columns from migration 25)
   * 9. Return result
   *
   * On CostCeilingExceededError: writes ledger row with error='aborted_ceiling:...' and re-throws.
   */
  async run(options: AgentRunOptions): Promise<AgentRunResult> {
    const supabase = createAdminClient()
    const client = getAnthropicClient()

    // ------------------------------------------------------------------
    // Step 1: Load or create session
    // ------------------------------------------------------------------
    let sessionId = options.sessionId
    let previousMessages: AgentMessage[] = []
    const orgId = options.organizationId ?? null

    if (sessionId) {
      const { data: session } = await supabase
        .from('agent_sessions')
        .select('messages, tokens_used')
        .eq('id', sessionId)
        .single()

      if (session) {
        previousMessages = (session.messages as AgentMessage[]) || []
      }
    } else {
      const { data: newSession, error } = await supabase
        .from('agent_sessions')
        .insert({
          organization_id: orgId,
          agent_type: this.config.agentType,
          lead_id: options.leadId || null,
          messages: [],
          tokens_used: 0,
          status: 'active',
        })
        .select('id')
        .single()

      if (error || !newSession) {
        throw new Error(`Failed to create agent session: ${error?.message}`)
      }
      sessionId = newSession.id
    }

    // ------------------------------------------------------------------
    // Step 2: Build message history
    // ------------------------------------------------------------------
    const claudeMessages: Anthropic.MessageParam[] = previousMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))

    let userContent = options.input
    if (options.context) {
      userContent = `Context:\n${JSON.stringify(options.context, null, 2)}\n\nRequest:\n${options.input}`
    }
    claudeMessages.push({ role: 'user', content: userContent })

    // ------------------------------------------------------------------
    // Step 3: Resolve effective model (tier-based selection — USAGE-12)
    // ------------------------------------------------------------------
    // Fetch tier from DB — required for selectModel tier enforcement.
    // orgId=null (no tenant) defaults to 'core' (most restrictive).
    let tier = 'core'
    if (orgId) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('plan_id')
        .eq('id', orgId)
        .single()
      if (orgData?.plan_id) {
        tier = getCanonicalTierName(orgData.plan_id)
      }
    }

    const model = selectModel(this.config.model, tier)
    const maxTokens = this.config.maxTokens ?? DEFAULT_MAX_TOKENS

    console.log('[base-agent]', {
      agentType: this.config.agentType,
      model,
      orgId,
      tier,
    })

    // ------------------------------------------------------------------
    // Step 4: Pre-call cost ceiling check (USAGE-07)
    // ------------------------------------------------------------------
    const inputEstimate = estimateInputTokens(claudeMessages)
    const projected = projectCost(inputEstimate, maxTokens, model)

    if (orgId) {
      try {
        await checkCostCeiling(orgId, projected)
      } catch (ceilErr) {
        if (ceilErr instanceof CostCeilingExceededError) {
          // Write abort ledger row — ceiling blocked the call before it fired
          const exceededBy =
            ceilErr.mtdSpendCents + ceilErr.projectedCents - ceilErr.ceilingCents
          await supabase.from('ai_usage_ledger').insert({
            organization_id: orgId,
            agent_session_id: sessionId,
            agent_type: this.config.agentType,
            model,
            input_tokens: 0,
            output_tokens: 0,
            cache_read_tokens: 0,
            cache_write_tokens: 0,
            cost_zar_cents: 0,
            request_id: null,
            was_retry: false,
            error: `aborted_ceiling: ${exceededBy} cents over ${ceilErr.ceilingCents}`,
            recorded_at: new Date().toISOString(),
          })
          // Mark session failed and re-throw for caller to surface
          await supabase
            .from('agent_sessions')
            .update({ status: 'failed' })
            .eq('id', sessionId)
          throw ceilErr
        }
        throw ceilErr
      }
    }

    // ------------------------------------------------------------------
    // Step 5: Call Anthropic API
    // Assemble system blocks via buildSystemBlocks for brand-voice cache isolation (VOICE-03/04).
    // BaseAgent owns block composition — subclasses pass systemPrompt as a plain string.
    // ------------------------------------------------------------------
    const agentInstructions = typeof this.config.systemPrompt === 'string'
      ? this.config.systemPrompt
      : ''
    const brandVoice = orgId ? await this.loadBrandVoice(orgId) : null
    const systemBlocks = buildSystemBlocks(orgId ?? 'unknown', agentInstructions, brandVoice)

    try {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: this.config.temperature,
        system: systemBlocks as Anthropic.TextBlockParam[],
        messages: claudeMessages,
      })

      // ----------------------------------------------------------------
      // Step 6: Compute actual cost from response.usage
      // ----------------------------------------------------------------
      const responseUsage = response.usage as Anthropic.Usage & {
        cache_read_input_tokens?: number
        cache_creation_input_tokens?: number
      }
      const usage = {
        input_tokens: responseUsage.input_tokens,
        output_tokens: responseUsage.output_tokens,
        cache_read_input_tokens: responseUsage.cache_read_input_tokens ?? 0,
        cache_creation_input_tokens: responseUsage.cache_creation_input_tokens ?? 0,
      }
      const costCents = computeCostZarCents(usage, model)

      // ----------------------------------------------------------------
      // Step 7: INSERT ai_usage_ledger row (success path — always write)
      // ----------------------------------------------------------------
      await supabase.from('ai_usage_ledger').insert({
        organization_id: orgId,
        agent_session_id: sessionId,
        agent_type: this.config.agentType,
        model,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cache_read_tokens: usage.cache_read_input_tokens,
        cache_write_tokens: usage.cache_creation_input_tokens,
        cost_zar_cents: costCents,
        request_id: response.id ?? null,
        was_retry: false,
        error: null, // null = success
        recorded_at: new Date().toISOString(),
      })

      // ----------------------------------------------------------------
      // Step 8: Extract response text + parse
      // ----------------------------------------------------------------
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      )
      const responseText = textBlocks.map((b) => b.text).join('\n')

      const tokensUsed = usage.input_tokens + usage.output_tokens

      let parsedResult: unknown = null
      const status: AgentStatus = 'completed'
      try {
        parsedResult = this.parseResponse(responseText)
      } catch {
        parsedResult = { raw: responseText }
      }

      const newMessages: AgentMessage[] = [
        ...previousMessages,
        {
          role: 'user',
          content: userContent,
          timestamp: new Date().toISOString(),
        },
        {
          role: 'assistant',
          content: responseText,
          timestamp: new Date().toISOString(),
          tokens: tokensUsed,
        },
      ]

      // Fetch current session values for cumulative update
      const { data: existingSession } = await supabase
        .from('agent_sessions')
        .select(
          'tokens_used, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_zar_cents'
        )
        .eq('id', sessionId)
        .single()

      const totalTokens = ((existingSession?.tokens_used as number) || 0) + tokensUsed

      // ----------------------------------------------------------------
      // UPDATE agent_sessions — cumulative cost + token columns (migration 25)
      //
      // COALESCE(existing, 0) + new_value for each column.
      // Single-call agents write once; multi-call sessions accumulate.
      // ----------------------------------------------------------------
      await supabase
        .from('agent_sessions')
        .update({
          messages: newMessages,
          tokens_used: totalTokens,
          status,
          result: parsedResult,
          model,
          input_tokens:
            ((existingSession?.input_tokens as number) || 0) + usage.input_tokens,
          output_tokens:
            ((existingSession?.output_tokens as number) || 0) + usage.output_tokens,
          cache_read_tokens:
            ((existingSession?.cache_read_tokens as number) || 0) + usage.cache_read_input_tokens,
          cache_write_tokens:
            ((existingSession?.cache_write_tokens as number) || 0) +
            usage.cache_creation_input_tokens,
          cost_zar_cents:
            ((existingSession?.cost_zar_cents as number) || 0) + costCents,
        })
        .eq('id', sessionId)

      return {
        sessionId: sessionId!,
        response: responseText,
        tokensUsed: totalTokens,
        result: parsedResult,
        status,
      }
    } catch (error: unknown) {
      // CostCeilingExceededError is already handled above (abort ledger + re-throw)
      if (!(error instanceof CostCeilingExceededError)) {
        await supabase
          .from('agent_sessions')
          .update({ status: 'failed' })
          .eq('id', sessionId)
      }

      // ------------------------------------------------------------------
      // Phase 12 (hotfix): classify Anthropic SDK billing / rate-limit errors
      // before re-throwing so callers can surface meaningful UI messages.
      // Anthropic SDK throws with err.status (HTTP code) and err.message.
      // ------------------------------------------------------------------
      const err = error as { status?: number; message?: string }
      if (
        err?.status === 401 ||
        /insufficient.credit|billing|your.credit.balance/i.test(err?.message ?? '')
      ) {
        throw new AgentCreditError(
          `Anthropic credit error (status=${err.status ?? 'n/a'}): ${err.message ?? 'unknown'}`,
          { cause: error }
        )
      }
      if (err?.status === 429) {
        throw new AgentRateLimitError(
          `Anthropic rate limit (status=429): ${err.message ?? 'unknown'}`,
          { cause: error }
        )
      }

      throw error
    }
  }

  /**
   * Parse the raw response text into a structured result.
   * Override in subclasses for specific parsing logic.
   */
  protected abstract parseResponse(response: string): unknown
}

// Re-export model constants for subclass use (avoids double-importing model-registry)
export { MODEL_IDS, DEFAULT_MODEL }
