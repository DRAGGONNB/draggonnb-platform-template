/** @vitest-environment node */

import { describe, it, expect } from 'vitest'
import { padToCacheFloor, STABLE_PADDING, FLOOR_CHARS, CACHE_FLOOR_TOKENS } from '@/lib/brand-voice/pad-to-cache'

describe('padToCacheFloor', () => {
  it('empty string produces output of at least FLOOR_CHARS (14336) characters', () => {
    expect(padToCacheFloor('').length).toBeGreaterThanOrEqual(FLOOR_CHARS)
  })

  it('short brand voice produces output >= FLOOR_CHARS and starts with the original text', () => {
    const short = 'short brand voice'
    const result = padToCacheFloor(short)
    expect(result.length).toBeGreaterThanOrEqual(FLOOR_CHARS)
    expect(result.startsWith(short)).toBe(true)
  })

  it('text already above FLOOR_CHARS is returned unchanged', () => {
    const longText = 'x'.repeat(FLOOR_CHARS + 1000)
    expect(padToCacheFloor(longText)).toBe(longText)
  })

  it('CACHE_FLOOR_TOKENS is 4096', () => {
    expect(CACHE_FLOOR_TOKENS).toBe(4096)
  })

  it('STABLE_PADDING contains SA English markers', () => {
    expect(STABLE_PADDING).toContain('colour')
    expect(STABLE_PADDING).toContain('organise')
    expect(STABLE_PADDING).toContain('Africa/Johannesburg')
  })

  it('STABLE_PADDING alone is >= FLOOR_CHARS', () => {
    // Guarantees that padToCacheFloor('') always meets the floor in a single append
    expect(STABLE_PADDING.length).toBeGreaterThanOrEqual(FLOOR_CHARS)
  })

  it('result is deterministic for the same input', () => {
    const input = 'test brand voice'
    expect(padToCacheFloor(input)).toBe(padToCacheFloor(input))
  })
})
