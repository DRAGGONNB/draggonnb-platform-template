/**
 * Unit tests for BrandSafetyAgent
 *
 * Tests focus on parseResponse() shape validation.
 * Model is locked to claude-haiku-4-5-20251001 at temperature=0 for determinism.
 * Brand voice arrives via BaseAgent.run() injection (lib/agents/base-agent.ts:263).
 */

import { describe, it, expect, vi } from 'vitest'

// ============================================================================
// MODULE MOCKS — hoisted before imports by Vitest
// ============================================================================

vi.mock('@/lib/config/env', () => ({
  env: {
    ANTHROPIC_API_KEY: 'sk-ant-test-key',
    RESEND_API_KEY: 're_test_key',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          gte: () => Promise.resolve({ count: 0, error: null }),
        }),
        head: true,
        count: 'exact',
      }),
    }),
  }),
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: vi.fn() }
  },
}))

vi.mock('@/lib/payments/payfast', () => ({
  getCanonicalTierName: (tier: string) => tier,
}))

vi.mock('@/lib/ai/cost-ceiling', () => ({
  checkCostCeiling: vi.fn().mockResolvedValue(undefined),
  projectCost: vi.fn().mockReturnValue(10),
  CostCeilingExceededError: class extends Error {},
}))

// ============================================================================
// TESTS
// ============================================================================

import { BrandSafetyAgent } from '@/lib/campaigns/agent/brand-safety-checker'
import type { SafetyFlagResult } from '@/lib/campaigns/agent/brand-safety-checker'

// Expose protected parseResponse for testing
class TestableSafetyAgent extends BrandSafetyAgent {
  public parse(response: string): SafetyFlagResult {
    return this.parseResponse(response) as SafetyFlagResult
  }
}

describe('BrandSafetyAgent.parseResponse()', () => {
  const agent = new TestableSafetyAgent()

  it('parses safe-clear result: safe=true, flags=[], recommendation=approve', () => {
    const input = JSON.stringify({
      safe: true,
      flags: [],
      recommendation: 'approve',
    } satisfies SafetyFlagResult)
    const result = agent.parse(input)
    expect(result.safe).toBe(true)
    expect(result.flags).toHaveLength(0)
    expect(result.recommendation).toBe('approve')
  })

  it('parses single insensitive flag correctly', () => {
    const input = JSON.stringify({
      safe: false,
      flags: [
        {
          type: 'insensitive',
          reason: 'Joke about load shedding during active outage period',
          excerpt: 'Drink up to forget your problems!',
        },
      ],
      recommendation: 'revise',
    } satisfies SafetyFlagResult)
    const result = agent.parse(input)
    expect(result.safe).toBe(false)
    expect(result.flags).toHaveLength(1)
    expect(result.flags[0].type).toBe('insensitive')
    expect(result.flags[0].excerpt).toBe('Drink up to forget your problems!')
    expect(result.recommendation).toBe('revise')
  })

  it('parses off_brand flag type', () => {
    const input = JSON.stringify({
      safe: false,
      flags: [{ type: 'off_brand', reason: 'Uses aggressive hard-sell tone', excerpt: 'BUY NOW OR MISS OUT FOREVER' }],
      recommendation: 'revise',
    } satisfies SafetyFlagResult)
    const result = agent.parse(input)
    expect(result.flags[0].type).toBe('off_brand')
  })

  it('parses time_inappropriate flag type', () => {
    const input = JSON.stringify({
      safe: false,
      flags: [{ type: 'time_inappropriate', reason: 'Festive content during mourning period', excerpt: 'Celebrate with us!' }],
      recommendation: 'revise',
    } satisfies SafetyFlagResult)
    const result = agent.parse(input)
    expect(result.flags[0].type).toBe('time_inappropriate')
  })

  it('parses forbidden_topic flag with reject recommendation', () => {
    const input = JSON.stringify({
      safe: false,
      flags: [{ type: 'forbidden_topic', reason: 'Mentions competitor brand listed as forbidden', excerpt: 'Better than Brand X' }],
      recommendation: 'reject',
    } satisfies SafetyFlagResult)
    const result = agent.parse(input)
    expect(result.flags[0].type).toBe('forbidden_topic')
    expect(result.recommendation).toBe('reject')
  })

  it('strips markdown code fences before parsing', () => {
    const raw: SafetyFlagResult = { safe: true, flags: [], recommendation: 'approve' }
    const fenced = '```json\n' + JSON.stringify(raw) + '\n```'
    const result = agent.parse(fenced)
    expect(result.safe).toBe(true)
  })

  it('throws on malformed shape — missing recommendation field', () => {
    const malformed = JSON.stringify({ safe: true, flags: [] })
    expect(() => agent.parse(malformed)).toThrow(/malformed response shape/)
  })

  it('throws on invalid JSON', () => {
    expect(() => agent.parse('not json')).toThrow(/failed to parse JSON/)
  })
})
