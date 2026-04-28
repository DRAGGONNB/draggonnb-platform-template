/**
 * Model Registry
 *
 * Canonical model IDs, pricing, and tier-based selection policy.
 *
 * POLICY: Haiku 4.5 is the default for all tiers. Sonnet/Opus are
 * allow-listed only for scale or platform_admin orgs. Core/growth orgs
 * requesting a premium model receive a logged warning and are silently
 * downgraded to Haiku (no exception, no broken UX).
 *
 * This eliminates ERR-029 (silent Sonnet fallback draining cost on all
 * 6 production agents when no model is specified).
 */

// ============================================================================
// MODEL IDS
// ============================================================================

export const MODEL_IDS = {
  HAIKU_4_5: 'claude-haiku-4-5-20251001',
  SONNET_4_6: 'claude-sonnet-4-6-20251022',
  OPUS_4_7: 'claude-opus-4-7-20260101',
} as const

export type ModelId = typeof MODEL_IDS[keyof typeof MODEL_IDS]

export const DEFAULT_MODEL: ModelId = MODEL_IDS.HAIKU_4_5

// ============================================================================
// PRICING
// ============================================================================

export interface ModelPricing {
  /** Cost per million input tokens in USD */
  inputCostPerMTokUsd: number
  /** Cost per million cache-read input tokens in USD (10% of input rate) */
  cachedInputCostPerMTokUsd: number
  /** Cost per million output tokens in USD */
  outputCostPerMTokUsd: number
}

export const MODEL_PRICING: Record<ModelId, ModelPricing> = {
  [MODEL_IDS.HAIKU_4_5]: {
    inputCostPerMTokUsd: 1.0,
    cachedInputCostPerMTokUsd: 0.10,
    outputCostPerMTokUsd: 5.0,
  },
  [MODEL_IDS.SONNET_4_6]: {
    inputCostPerMTokUsd: 3.0,
    cachedInputCostPerMTokUsd: 0.30,
    outputCostPerMTokUsd: 15.0,
  },
  [MODEL_IDS.OPUS_4_7]: {
    inputCostPerMTokUsd: 15.0,
    cachedInputCostPerMTokUsd: 1.50,
    outputCostPerMTokUsd: 75.0,
  },
}

// ============================================================================
// TIER-BASED MODEL SELECTION
// ============================================================================

/**
 * Select the effective model to use, applying tier-based downgrade policy.
 *
 * - No model requested → Haiku (DEFAULT_MODEL)
 * - Premium model (Sonnet/Opus) + scale/platform_admin tier → allowed
 * - Premium model + core/growth tier → silently downgrade to Haiku + log warning
 *
 * The `tier` param should be a canonical tier name (core/growth/scale/platform_admin).
 * Pass through getCanonicalTierName() before calling here if reading from DB.
 */
export function selectModel(requestedModel: ModelId | undefined, tier: string): ModelId {
  // No model specified — default to Haiku
  if (!requestedModel) return DEFAULT_MODEL

  // Haiku is always allowed
  if (requestedModel === MODEL_IDS.HAIKU_4_5) return requestedModel

  // Premium model (Sonnet or Opus) — check tier allowance
  const tierAllowsPremium = tier === 'scale' || tier === 'platform_admin'

  if (!tierAllowsPremium) {
    console.warn(
      `[model-registry] Tier "${tier}" requested premium model ${requestedModel}; ` +
      `downgrading to ${DEFAULT_MODEL} (USAGE-12 enforcement)`
    )
    return DEFAULT_MODEL
  }

  return requestedModel
}
