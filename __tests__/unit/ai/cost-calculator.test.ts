/**
 * Unit tests for lib/ai/cost-calculator.ts
 *
 * Verifies ZAR-cent cost computation for Haiku/Sonnet models,
 * cache-read/write pricing ratios, and Math.ceil margin protection.
 */

import { describe, it, expect } from 'vitest'
import { computeCostZarCents } from '@/lib/ai/cost-calculator'
import { MODEL_IDS } from '@/lib/ai/model-registry'

const HAIKU = MODEL_IDS.HAIKU_4_5
const SONNET = MODEL_IDS.SONNET_4_6

describe('computeCostZarCents', () => {
  // USD→ZAR rate: 16.6; Haiku input = $1/MTok
  // 1,000 input tokens = 0.001 MTok * $1 = $0.001
  // 200 output tokens = 0.0002 MTok * $5 = $0.001
  // total = $0.002 USD * 1660 = 3.32 ZAR cents → ceil → 4

  it('Haiku 1k input + 200 output ≈ expected ZAR cents (ceil)', () => {
    const result = computeCostZarCents(
      { input_tokens: 1_000, output_tokens: 200 },
      HAIKU,
    )
    // 1000 * $1/MTok + 200 * $5/MTok = $0.001 + $0.001 = $0.002
    // $0.002 * 1660 = 3.32 → ceil → 4
    expect(result).toBe(4)
    expect(result).toBeGreaterThan(0)
  })

  it('Sonnet pricing is 3× Haiku for same token counts', () => {
    const haiku = computeCostZarCents(
      { input_tokens: 100_000, output_tokens: 0 },
      HAIKU,
    )
    const sonnet = computeCostZarCents(
      { input_tokens: 100_000, output_tokens: 0 },
      SONNET,
    )
    // Haiku $1/MTok, Sonnet $3/MTok → ratio should be ~3
    expect(sonnet / haiku).toBeCloseTo(3, 0)
  })

  it('cache reads are charged at ~10% of input rate', () => {
    // Regular input only
    const regular = computeCostZarCents(
      { input_tokens: 1_000, output_tokens: 0 },
      HAIKU,
    )
    // All tokens from cache reads (and regular input = 0)
    const cached = computeCostZarCents(
      { input_tokens: 1_000, output_tokens: 0, cache_read_input_tokens: 1_000 },
      HAIKU,
    )
    // cached should be ~10% of regular
    // regular = 1000/1e6 * $1 * 1660 = 1.66 → ceil → 2
    // cached reads: 1000/1e6 * $0.10 * 1660 = 0.166 → ceil → 1
    // The ratio should be roughly 10×
    expect(regular).toBeGreaterThan(cached)
    // Cache reads are ≤20% of full input cost (10% rate + ceiling effects)
    expect(cached).toBeLessThanOrEqual(Math.ceil(regular * 0.2))
  })

  it('cache writes are charged at 1.25× input rate', () => {
    // Regular 1000-token input cost
    const regular = computeCostZarCents(
      { input_tokens: 1_000, output_tokens: 0 },
      HAIKU,
    )
    // Same tokens but written to cache (cache_creation_input_tokens = 1000, regular = 0)
    const cacheWrite = computeCostZarCents(
      {
        input_tokens: 1_000,
        output_tokens: 0,
        cache_creation_input_tokens: 1_000,
      },
      HAIKU,
    )
    // cache write = 1.25× input rate
    // regular input = 1000 - 1000 (cache creates) = 0 regular input
    // cache write = 1000/1e6 * $1.25 * 1660 = 2.075 → ceil → 3
    // regular = 1000/1e6 * $1 * 1660 = 1.66 → ceil → 2
    expect(cacheWrite).toBeGreaterThan(regular)
  })

  it('Math.ceil never rounds down — margin is always protected', () => {
    // Craft a scenario where exact cost is fractional
    // 1 input token Haiku: 1/1e6 * $1 = $0.000001 * 1660 = 0.00166 → ceil → 1
    const result = computeCostZarCents(
      { input_tokens: 1, output_tokens: 0 },
      HAIKU,
    )
    expect(result).toBeGreaterThanOrEqual(1)
    expect(Number.isInteger(result)).toBe(true)
  })

  it('zero tokens returns 0 cost', () => {
    const result = computeCostZarCents(
      { input_tokens: 0, output_tokens: 0 },
      HAIKU,
    )
    expect(result).toBe(0)
  })

  it('throws for unknown model', () => {
    expect(() =>
      computeCostZarCents(
        { input_tokens: 100, output_tokens: 100 },
        'claude-unknown-model' as never,
      )
    ).toThrow('Unknown model for pricing')
  })

  it('large token counts produce reasonable ZAR costs (1M tokens each)', () => {
    const haiku = computeCostZarCents(
      { input_tokens: 1_000_000, output_tokens: 1_000_000 },
      HAIKU,
    )
    // Haiku: 1M input * $1 + 1M output * $5 = $6 * 1660 = 9960 cents
    expect(haiku).toBe(9960)

    const sonnet = computeCostZarCents(
      { input_tokens: 1_000_000, output_tokens: 1_000_000 },
      SONNET,
    )
    // Sonnet: 1M * $3 + 1M * $15 = $18 * 1660 = 29880 cents
    expect(sonnet).toBe(29880)
  })
})
