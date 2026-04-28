/**
 * BrandSafetyAgent (CAMP-07)
 *
 * Haiku-based brand safety reviewer. Runs on every campaign draft before
 * it is eligible for scheduling. Returns structured flags so the UI can
 * show inline warnings without blocking publish for "revise"-level issues.
 *
 * Model: claude-haiku-4-5-20251001 (temperature=0 for deterministic safety rulings)
 * Budget: 20 checks/day per org — enforced by isUnderSafetyCheckBudget().
 * Quota escape: when exhausted, allow publishing with "proceed at your own
 *   discretion" banner (Plan 11-10 UX) — do NOT hard-block campaigns.
 *
 * Registered AgentType: 'campaign_brand_safety' (lib/agents/types.ts — Plan 11-02)
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { BaseAgent } from '@/lib/agents/base-agent'
import type { AgentConfig } from '@/lib/agents/types'
import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// OUTPUT TYPES
// ============================================================================

export type SafetyFlagType =
  | 'off_brand'
  | 'insensitive'
  | 'time_inappropriate'
  | 'forbidden_topic'

export interface SafetyFlag {
  type: SafetyFlagType
  reason: string
  /** Verbatim excerpt from the draft that triggered the flag */
  excerpt: string
}

/**
 * Structured brand safety result.
 *
 * recommendation rules (mirrors system prompt):
 * - 'approve': safe=true, flags=[]
 * - 'revise': 1-2 minor flags fixable with targeted edit
 * - 'reject': fundamentally inappropriate (hate speech, illegal, FORBIDDEN_TOPIC)
 */
export interface SafetyFlagResult {
  safe: boolean
  flags: SafetyFlag[]
  recommendation: 'approve' | 'revise' | 'reject'
}

// ============================================================================
// AGENT CONFIG
// ============================================================================

const CONFIG: AgentConfig = {
  agentType: 'campaign_brand_safety',
  model: 'claude-haiku-4-5-20251001',
  maxTokens: 512,
  temperature: 0,
  systemPrompt: `You are a brand safety reviewer for an SME marketing platform operating in South Africa.

Your job: evaluate marketing copy for BRAND SAFETY violations only.
Do NOT critique tone, grammar, or persuasiveness — those are separate concerns.

Check for:
1. OFF_BRAND: Copy contradicts the brand's stated values, tone, or forbidden topics
   (brand voice guidelines arrive in a separate system block — treat them as authoritative)
2. INSENSITIVE: References events, groups, or situations likely to cause offence in SA context:
   - Load-shedding jokes during active outages
   - Racial, ethnic, or religious stereotyping
   - Political content
   - Exploiting tragedy or hardship for commercial gain
3. TIME_INAPPROPRIATE: Festive or celebratory content published during active public mourning
   or declared national tragedy
4. FORBIDDEN_TOPIC: Any topic explicitly listed as forbidden in the brand voice guidelines appears

Output ONLY valid JSON (no markdown fences, no prose before or after the JSON):
{
  "safe": boolean,
  "flags": [
    {
      "type": "off_brand|insensitive|time_inappropriate|forbidden_topic",
      "reason": "brief explanation",
      "excerpt": "verbatim text from draft that triggered this flag"
    }
  ],
  "recommendation": "approve|revise|reject"
}

Recommendation rules:
- "approve": safe=true AND flags=[]
- "revise": 1-2 minor flags that can be fixed with a targeted edit
- "reject": content is fundamentally inappropriate (hate speech, illegal claims, FORBIDDEN_TOPIC hit)

When in doubt, flag as "revise" rather than "reject" — conservative but not punitive.`,
}

// ============================================================================
// AGENT
// ============================================================================

export class BrandSafetyAgent extends BaseAgent {
  constructor() {
    super(CONFIG)
  }

  /**
   * Parse Haiku response into SafetyFlagResult.
   *
   * Strips markdown fences (defensive — system prompt says no fences but Haiku
   * occasionally ignores this under high load). Validates shape strictly.
   * Throws on parse failure — BaseAgent stores raw response for diagnostics.
   */
  protected parseResponse(response: string): SafetyFlagResult {
    // Strip markdown fences (```json ... ``` or ``` ... ```)
    const cleaned = response.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      throw new Error(
        `BrandSafetyAgent: failed to parse JSON response. Raw (first 200 chars): ${cleaned.slice(0, 200)}`
      )
    }

    const result = parsed as SafetyFlagResult
    if (
      typeof result.safe !== 'boolean' ||
      !Array.isArray(result.flags) ||
      !result.recommendation
    ) {
      throw new Error(
        'BrandSafetyAgent: malformed response shape. Expected {safe, flags[], recommendation}. Got: ' +
          JSON.stringify(Object.keys(result ?? {}))
      )
    }

    return result
  }
}

// ============================================================================
// DAILY BUDGET HELPER
// ============================================================================

/**
 * Returns true if the org is under its safety-check daily budget (20/day).
 *
 * When quota is exhausted, callers should allow publish with a banner
 * ("Brand safety check quota reached — proceed at your own discretion?")
 * rather than hard-blocking. Banner UX is Plan 11-10.
 *
 * Per RESEARCH B section 8: 20/day is a soft limit.
 * Phase 12 may add a `safety_check_daily_limit` column to tenant_modules.config.campaigns
 * for per-tenant override. For now hardcoded here.
 */
export async function isUnderSafetyCheckBudget(
  orgId: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  const client = supabase ?? createAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  const { count } = await client
    .from('ai_usage_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('agent_type', 'campaign_brand_safety')
    .gte('created_at', today)
  return (count ?? 0) < 20
}
