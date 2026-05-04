/** @vitest-environment node */
/**
 * callback-registry.ts unit tests — parseCallbackData + buildCallbackData.
 *
 * Checks:
 *   1. buildCallbackData produces the canonical format
 *   2. parseCallbackData round-trips correctly
 *   3. parseCallbackData returns null on malformed input
 *   4. parseCallbackData handles all three valid verbs
 *   5. reason: prefix (not a verb) returns null
 *   6. UUID with hyphens parses correctly as resource_id
 */

import { describe, it, expect } from 'vitest'
import {
  buildCallbackData,
  parseCallbackData,
  buildCallbackPattern,
} from '@/lib/telegram/callback-registry'

const RESOURCE_UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('buildCallbackData()', () => {
  it('produces canonical {verb}:{product}:{action_key}:{resource_id} format', () => {
    const result = buildCallbackData('approve', 'draggonnb', 'damage_charge', RESOURCE_UUID)
    expect(result).toBe(`approve:draggonnb:damage_charge:${RESOURCE_UUID}`)
  })

  it('works for reject verb', () => {
    const result = buildCallbackData('reject', 'trophy', 'quota_change', RESOURCE_UUID)
    expect(result).toBe(`reject:trophy:quota_change:${RESOURCE_UUID}`)
  })

  it('works for ack verb', () => {
    const result = buildCallbackData('ack', 'draggonnb', 'rate_change', RESOURCE_UUID)
    expect(result).toBe(`ack:draggonnb:rate_change:${RESOURCE_UUID}`)
  })
})

describe('parseCallbackData()', () => {
  it('round-trips approve:draggonnb:damage_charge:uuid correctly', () => {
    const raw = `approve:draggonnb:damage_charge:${RESOURCE_UUID}`
    const parsed = parseCallbackData(raw)
    expect(parsed).not.toBeNull()
    expect(parsed!.verb).toBe('approve')
    expect(parsed!.product).toBe('draggonnb')
    expect(parsed!.action_key).toBe('damage_charge')
    expect(parsed!.resource_id).toBe(RESOURCE_UUID)
  })

  it('round-trips reject:trophy:safari_status_change:uuid correctly', () => {
    const raw = `reject:trophy:safari_status_change:${RESOURCE_UUID}`
    const parsed = parseCallbackData(raw)
    expect(parsed).not.toBeNull()
    expect(parsed!.verb).toBe('reject')
    expect(parsed!.product).toBe('trophy')
    expect(parsed!.action_key).toBe('safari_status_change')
  })

  it('returns null for malformed string (too few parts)', () => {
    expect(parseCallbackData('approve:draggonnb')).toBeNull()
    expect(parseCallbackData('')).toBeNull()
  })

  it('returns null for too many colon-separated parts (resource_id with colons)', () => {
    // If someone passes "approve:draggonnb:damage_charge:uuid:extra" it splits to 5 parts
    expect(parseCallbackData(`approve:draggonnb:damage_charge:${RESOURCE_UUID}:extra`)).toBeNull()
  })

  it('returns null when verb is not approve|reject|ack', () => {
    expect(parseCallbackData(`reason:draggonnb:damage_charge:${RESOURCE_UUID}`)).toBeNull()
    expect(parseCallbackData(`other:draggonnb:damage_charge:${RESOURCE_UUID}`)).toBeNull()
  })

  it('accepts ack as a valid verb', () => {
    const parsed = parseCallbackData(`ack:draggonnb:social_post:${RESOURCE_UUID}`)
    expect(parsed).not.toBeNull()
    expect(parsed!.verb).toBe('ack')
  })
})

describe('buildCallbackPattern()', () => {
  it('produces a RegExp that matches valid callback_data', () => {
    const pattern = buildCallbackPattern('approve', 'draggonnb', 'damage_charge')
    const data = `approve:draggonnb:damage_charge:${RESOURCE_UUID}`
    expect(pattern.test(data)).toBe(true)
  })

  it('does not match mismatched verb', () => {
    const pattern = buildCallbackPattern('approve', 'draggonnb', 'damage_charge')
    expect(pattern.test(`reject:draggonnb:damage_charge:${RESOURCE_UUID}`)).toBe(false)
  })
})
