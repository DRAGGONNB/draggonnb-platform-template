/**
 * BrandSafetyAgent regression tests
 *
 * Fixture-driven regression suite for BrandSafetyAgent.parseResponse().
 *
 * Strategy (RESEARCH B section 13 escape hatch):
 * - Temperature=0 Haiku output is deterministic in production but exact string
 *   values for "recommendation" can vary across model versions.
 * - Tests assert `safe` boolean strictly (boolean contract is locked).
 * - Tests are lenient on `recommendation` exact value for borderline cases
 *   (assert it is one of the valid enum values; not a specific string).
 * - `flags` array is asserted to be non-empty for unsafe inputs.
 *
 * Fixtures live in __tests__/fixtures/brand-safety/ and represent known Claude
 * response payloads. The test imports them and passes them to parseResponse()
 * directly — NO real API calls in this suite.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi } from 'vitest'

// ─── Mock env singleton to prevent validation failure in test context ─────────
// lib/config/env.ts runs Zod validation eagerly at module load. Tests don't have
// a full .env.local — mock the module to return a minimal env object.
vi.mock('@/lib/config/env', () => ({
  env: {
    ANTHROPIC_API_KEY: 'sk-ant-test-mock',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    PAYFAST_MERCHANT_ID: 'test-merchant',
    PAYFAST_MERCHANT_KEY: 'test-key',
    PAYFAST_MODE: 'sandbox',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    NODE_ENV: 'test',
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────
// Each fixture IS a SafetyFlagResult shape — the JSON string that parseResponse()
// would receive from Haiku. We stringify them to simulate the raw Claude response.

import cleanCopyFixture from '../../fixtures/brand-safety/clean-copy.json'
import insensitiveFixture from '../../fixtures/brand-safety/insensitive-content.json'
import offBrandFixture from '../../fixtures/brand-safety/off-brand.json'
import forbiddenTopicFixture from '../../fixtures/brand-safety/forbidden-topic.json'

// ─── Import agent ─────────────────────────────────────────────────────────────

import { BrandSafetyAgent } from '@/lib/campaigns/agent/brand-safety-checker'
import type { SafetyFlagResult } from '@/lib/campaigns/agent/brand-safety-checker'

// ─── Type guard for fixture data ──────────────────────────────────────────────

function asFixture(raw: unknown): SafetyFlagResult {
  return raw as SafetyFlagResult
}

// ─── Regression test cases ────────────────────────────────────────────────────

/**
 * Each case:
 * - `name`: human-readable description
 * - `fixture`: the pre-canned SafetyFlagResult (simulates Haiku's JSON response)
 * - `expectSafe`: the boolean that parseResponse MUST return
 * - `expectRec`: if provided, the recommendation must match exactly.
 *               If undefined, we only check it is a valid enum value.
 */
const cases: Array<{
  name: string
  fixture: unknown
  expectSafe: boolean
  expectRec?: 'approve' | 'revise' | 'reject'
}> = [
  {
    name: 'clean copy — Sunday brunch promotional text',
    fixture: cleanCopyFixture,
    expectSafe: true,
    expectRec: 'approve',
  },
  {
    name: 'insensitive content — load-shedding joke',
    fixture: insensitiveFixture,
    expectSafe: false,
    // BrandSafetyAgent prompt says "revise" for fixable minor flags
    expectRec: 'revise',
  },
  {
    name: 'off-brand content — aggressive tone contradicts brand voice',
    fixture: offBrandFixture,
    expectSafe: false,
    // Off-brand is revise-level (can be fixed with targeted edit)
    expectRec: 'revise',
  },
  {
    name: 'forbidden topic — politically charged content',
    fixture: forbiddenTopicFixture,
    expectSafe: false,
    expectRec: 'reject',
  },
]

describe('BrandSafetyAgent regression', () => {
  const agent = new BrandSafetyAgent()
  // Access parseResponse via cast (it is protected — test-only workaround)
  const parseResponse = (agent as unknown as { parseResponse: (r: string) => SafetyFlagResult }).parseResponse.bind(agent)

  it.each(cases)('classifies "$name" correctly', ({ fixture, expectSafe, expectRec }) => {
    // Convert the fixture object to a raw JSON string (simulating Haiku's response)
    const rawResponse = JSON.stringify(asFixture(fixture))

    // parseResponse should not throw for valid fixture shapes
    let result: SafetyFlagResult
    expect(() => {
      result = parseResponse(rawResponse)
    }).not.toThrow()

    // `safe` boolean must match exactly
    expect(result!.safe).toBe(expectSafe)

    // `flags` must be an array
    expect(Array.isArray(result!.flags)).toBe(true)

    // For unsafe inputs: flags must be non-empty
    if (!expectSafe) {
      expect(result!.flags.length).toBeGreaterThan(0)
    }

    // For safe inputs: flags must be empty
    if (expectSafe) {
      expect(result!.flags.length).toBe(0)
    }

    // `recommendation` must always be a valid enum value
    const validRecs = ['approve', 'revise', 'reject'] as const
    expect(validRecs).toContain(result!.recommendation)

    // If a specific recommendation is expected — assert it strictly
    if (expectRec !== undefined) {
      expect(result!.recommendation).toBe(expectRec)
    }
  })

  it('strips markdown code fences from response', () => {
    const wrapped = '```json\n{"safe":true,"flags":[],"recommendation":"approve"}\n```'
    const result = parseResponse(wrapped)
    expect(result.safe).toBe(true)
    expect(result.recommendation).toBe('approve')
  })

  it('throws on malformed JSON response', () => {
    expect(() => parseResponse('not valid json')).toThrow(
      /BrandSafetyAgent: failed to parse JSON response/
    )
  })

  it('throws on missing required fields', () => {
    // Missing `flags` array
    expect(() =>
      parseResponse(JSON.stringify({ safe: true, recommendation: 'approve' }))
    ).toThrow(/malformed response shape/)
  })
})
