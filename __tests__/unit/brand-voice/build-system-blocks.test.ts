/** @vitest-environment node */

import { describe, it, expect } from 'vitest'
import {
  buildSystemBlocks,
  extractOrgIdFromBlocks,
} from '@/lib/brand-voice/build-system-blocks'

const ORG_A = 'org-uuid-aaaa-1111'
const ORG_B = 'org-uuid-bbbb-2222'
const INSTRUCTIONS = 'You are a helpful agent.'
const VOICE = 'We are bold and direct.'

describe('buildSystemBlocks', () => {
  it('returns 2 blocks when brandVoicePrompt is null', () => {
    const blocks = buildSystemBlocks(ORG_A, INSTRUCTIONS, null)
    expect(blocks).toHaveLength(2)
  })

  it('block 0 contains the org_id', () => {
    const blocks = buildSystemBlocks(ORG_A, INSTRUCTIONS, null)
    expect(blocks[0].text).toContain(`org_id=${ORG_A}`)
  })

  it('block 1 is the agent instructions with no cache_control', () => {
    const blocks = buildSystemBlocks(ORG_A, INSTRUCTIONS, null)
    expect(blocks[1].text).toBe(INSTRUCTIONS)
    expect(blocks[1].cache_control).toBeUndefined()
  })

  it('block 0 has no cache_control', () => {
    const blocks = buildSystemBlocks(ORG_A, INSTRUCTIONS, null)
    expect(blocks[0].cache_control).toBeUndefined()
  })

  it('returns 3 blocks when brandVoicePrompt is provided', () => {
    const blocks = buildSystemBlocks(ORG_A, INSTRUCTIONS, VOICE)
    expect(blocks).toHaveLength(3)
  })

  it('block 2 has cache_control: ephemeral when voice is provided', () => {
    const blocks = buildSystemBlocks(ORG_A, INSTRUCTIONS, VOICE)
    expect(blocks[2].cache_control).toEqual({ type: 'ephemeral' })
  })

  it('block 2 text is the brand voice prompt', () => {
    const blocks = buildSystemBlocks(ORG_A, INSTRUCTIONS, VOICE)
    expect(blocks[2].text).toBe(VOICE)
  })

  it('two different orgIds produce different block-0 text (cache key isolation invariant)', () => {
    const blocksA = buildSystemBlocks(ORG_A, INSTRUCTIONS, VOICE)
    const blocksB = buildSystemBlocks(ORG_B, INSTRUCTIONS, VOICE)
    expect(blocksA[0].text).not.toBe(blocksB[0].text)
  })

  it('all block types are "text"', () => {
    const blocks = buildSystemBlocks(ORG_A, INSTRUCTIONS, VOICE)
    for (const block of blocks) {
      expect(block.type).toBe('text')
    }
  })
})

describe('extractOrgIdFromBlocks', () => {
  it('round-trips the org_id through buildSystemBlocks', () => {
    const blocks = buildSystemBlocks(ORG_A, INSTRUCTIONS, VOICE)
    expect(extractOrgIdFromBlocks(blocks)).toBe(ORG_A)
  })

  it('returns null for an empty array', () => {
    expect(extractOrgIdFromBlocks([])).toBeNull()
  })

  it('returns null for a malformed block 0', () => {
    const malformed = [{ type: 'text' as const, text: 'not a tenant context block' }]
    expect(extractOrgIdFromBlocks(malformed)).toBeNull()
  })

  it('correctly extracts org UUID format IDs', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    const blocks = buildSystemBlocks(uuid, INSTRUCTIONS, null)
    expect(extractOrgIdFromBlocks(blocks)).toBe(uuid)
  })
})
