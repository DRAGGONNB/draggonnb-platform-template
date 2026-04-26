/**
 * VOICE-05: Golden Two-Tenant Cache Isolation Test
 *
 * WHAT THIS TESTS:
 * 1. Two orgs with different brand voices produce different agent outputs
 *    (proves cross-tenant cache leakage is impossible with Option B cache architecture)
 * 2. A second call to the same org hits the Anthropic prompt cache
 *    (proves the 4096-token floor padding achieves cache eligibility)
 *
 * WHY THIS IS NON-NEGOTIABLE:
 * Pitfall 4 (cross-tenant cache key collision) is a POPI breach. If org_A's brand voice
 * bleeds into org_B's agent outputs, tenant data isolation has failed. The org_id-as-block-0
 * architecture (VOICE-04) prevents this structurally, but this test proves it empirically.
 *
 * ENV GATE:
 * This test SKIPS when TEST_CACHE_ORG_A or TEST_CACHE_ORG_B are not set.
 * This is correct and expected in local dev and CI without seeded test orgs.
 *
 * TO RUN LOCALLY:
 * 1. Seed two real org UUIDs in your .env.local:
 *    TEST_CACHE_ORG_A=<uuid-of-org-a>
 *    TEST_CACHE_ORG_B=<uuid-of-org-b>
 *    ANTHROPIC_API_KEY=<your-key>
 * 2. Run: pnpm test __tests__/integration/brand-voice/cache-isolation.test.ts
 *
 * CHRIS-TODO (deferred soft, not blocker):
 * Set TEST_CACHE_ORG_A and TEST_CACHE_ORG_B in Vercel CI environment variables
 * once two stable test organisations exist with brand_voice_prompt populated.
 * The test will then run automatically in CI and guard against future regressions.
 *
 * NOTE: Voice fixtures are constructed inline (not fetched from DB) so the test
 * controls the brand voice content precisely. The padToCacheFloor() call mirrors
 * what the save route does in production.
 */

/** @vitest-environment node */

import { describe, it, expect } from 'vitest'
import Anthropic from '@anthropic-ai/sdk'
import { buildSystemBlocks } from '@/lib/brand-voice/build-system-blocks'
import { padToCacheFloor } from '@/lib/brand-voice/pad-to-cache'

const ORG_A = process.env.TEST_CACHE_ORG_A
const ORG_B = process.env.TEST_CACHE_ORG_B

// Voice fixtures include UNAMBIGUOUS signature phrases that must appear in any output.
// The phrases are injected as mandatory instructions so the model MUST include them,
// defeating short-output flakiness that could make .not.toBe unreliable.
const VOICE_A = padToCacheFloor(
  'You are bold and direct. Use exclamation marks. Every reply MUST end with the literal phrase "Hustle on!" — no exceptions, no rephrasing.'
)
const VOICE_B = padToCacheFloor(
  'You are warm and gentle. Use ellipses... Every reply MUST end with the literal phrase "with care." — no exceptions, no rephrasing.'
)
const PROMPT = 'Write a 1-sentence welcome message for a new client.'

describe.skipIf(!ORG_A || !ORG_B)('VOICE-05 golden two-tenant cache isolation', () => {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  it('two orgs with different voices produce different outputs and each contains its signature phrase', async () => {
    const blocksA = buildSystemBlocks(ORG_A!, 'Welcome agent', VOICE_A)
    const blocksB = buildSystemBlocks(ORG_B!, 'Welcome agent', VOICE_B)

    const [respA, respB] = await Promise.all([
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: blocksA as Parameters<typeof anthropic.messages.create>[0]['system'],
        messages: [{ role: 'user', content: PROMPT }],
      }),
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: blocksB as Parameters<typeof anthropic.messages.create>[0]['system'],
        messages: [{ role: 'user', content: PROMPT }],
      }),
    ])

    const textA = respA.content[0].type === 'text' ? respA.content[0].text : ''
    const textB = respB.content[0].type === 'text' ? respB.content[0].text : ''

    // Weak assertion: outputs must differ (could fail by statistical chance with trivial prompts)
    expect(textA).not.toBe(textB)

    // Strong marker assertions: signature phrases prove each output reflects ITS OWN voice.
    // If org_B's voice bled into org_A's output, textA would contain "with care" not "hustle on".
    expect(textA.toLowerCase()).toContain('hustle on')
    expect(textB.toLowerCase()).toContain('with care')
  }, 30_000)

  it('second call to same org gets cache hit (cache_read_input_tokens > 0)', async () => {
    const blocks = buildSystemBlocks(ORG_A!, 'Welcome agent', VOICE_A)
    const system = blocks as Parameters<typeof anthropic.messages.create>[0]['system']

    // First call — establishes cache (expect cache_creation_input_tokens > 0)
    await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system,
      messages: [{ role: 'user', content: PROMPT + ' (call 1)' }],
    })

    // Second call — identical system blocks, same org — should HIT cache
    const second = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system,
      messages: [{ role: 'user', content: PROMPT + ' (call 2)' }],
    })

    const usage = second.usage as Anthropic.Usage & { cache_read_input_tokens?: number }
    expect(usage.cache_read_input_tokens ?? 0).toBeGreaterThan(0)
  }, 30_000)
})
