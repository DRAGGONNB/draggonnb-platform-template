/**
 * Cost Calculator
 *
 * Pure function to compute Anthropic API cost in ZAR cents from a
 * raw SDK response.usage payload and the model used.
 *
 * USD→ZAR rate is hardcoded at 16.6 (1 USD = R16.60).
 * OPS-01 (env validation) will surface ANTHROPIC_USD_ZAR_RATE env var in
 * a future phase — acceptable hard-code for v3.0.
 *
 * Math.ceil() is used for rounding to protect margin (never rounds down).
 */

import { ModelId, MODEL_PRICING } from './model-registry'

// ============================================================================
// TYPES
// ============================================================================

export interface AnthropicUsage {
  input_tokens: number
  output_tokens: number
  /** Cache-read input tokens (Anthropic SDK v0.73+) */
  cache_read_input_tokens?: number
  /** Cache-creation input tokens (Anthropic SDK v0.73+) */
  cache_creation_input_tokens?: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** ZAR cents per USD: 1 USD = R16.60 = 1660 ZAR cents.
 *  NOTE: Use integer literal (not 16.6 * 100) — floating point gives 1660.0000000000002. */
const USD_TO_ZAR_CENTS = 1660

/** Cache write multiplier: 1.25× input cost (Anthropic spec) */
const CACHE_WRITE_MULTIPLIER = 1.25

// ============================================================================
// COMPUTE COST
// ============================================================================

/**
 * Compute the cost of an Anthropic API call in ZAR cents.
 *
 * Token breakdown:
 * - Regular input = input_tokens - cache_read_input_tokens - cache_creation_input_tokens
 * - Cache reads  = cache_read_input_tokens   (charged at 10% of input rate)
 * - Cache writes = cache_creation_input_tokens (charged at 125% of input rate)
 * - Output       = output_tokens              (charged at output rate)
 *
 * Returns whole ZAR cents (ceil to protect margin).
 */
export function computeCostZarCents(usage: AnthropicUsage, model: ModelId): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) {
    throw new Error(`Unknown model for pricing: ${model}`)
  }

  const cacheReads = usage.cache_read_input_tokens ?? 0
  const cacheCreates = usage.cache_creation_input_tokens ?? 0
  // Regular input = tokens that are NOT from cache reads or writes
  const regularInputs = Math.max(0, usage.input_tokens - cacheReads - cacheCreates)

  const inputCostUsd =
    (regularInputs / 1_000_000) * pricing.inputCostPerMTokUsd
  const cachedReadCostUsd =
    (cacheReads / 1_000_000) * pricing.cachedInputCostPerMTokUsd
  const cacheWriteCostUsd =
    (cacheCreates / 1_000_000) * (pricing.inputCostPerMTokUsd * CACHE_WRITE_MULTIPLIER)
  const outputCostUsd =
    (usage.output_tokens / 1_000_000) * pricing.outputCostPerMTokUsd

  const totalUsd = inputCostUsd + cachedReadCostUsd + cacheWriteCostUsd + outputCostUsd

  // Round up to whole ZAR cents — protects margin, never undercharges
  return Math.ceil(totalUsd * USD_TO_ZAR_CENTS)
}
