/** @vitest-environment node */

import { describe, it, expect } from 'vitest'
import {
  PAYFAST_PREFIX,
  makeMPaymentId,
  parseMPaymentId,
} from '@/lib/payments/payfast-prefix'

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('PAYFAST_PREFIX enum', () => {
  it('has all four expected prefix values', () => {
    expect(PAYFAST_PREFIX.SUBSCRIPTION).toBe('DRG')
    expect(PAYFAST_PREFIX.ADDON).toBe('ADDON')
    expect(PAYFAST_PREFIX.TOPUP).toBe('TOPUP')
    expect(PAYFAST_PREFIX.ONEOFF).toBe('ONEOFF')
  })
})

describe('makeMPaymentId', () => {
  it('produces DRG-{uuid}-{timestamp} format for SUBSCRIPTION prefix', () => {
    const result = makeMPaymentId(PAYFAST_PREFIX.SUBSCRIPTION, VALID_UUID)
    expect(result).toMatch(/^DRG-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d+$/)
  })

  it('produces ADDON-{uuid}-{timestamp} format for ADDON prefix', () => {
    const result = makeMPaymentId(PAYFAST_PREFIX.ADDON, VALID_UUID)
    expect(result).toMatch(/^ADDON-/)
    expect(result).toContain(VALID_UUID)
  })

  it('produces TOPUP-{uuid}-{timestamp} format for TOPUP prefix', () => {
    const result = makeMPaymentId(PAYFAST_PREFIX.TOPUP, VALID_UUID)
    expect(result).toMatch(/^TOPUP-/)
  })

  it('produces ONEOFF-{uuid}-{timestamp} format for ONEOFF prefix', () => {
    const result = makeMPaymentId(PAYFAST_PREFIX.ONEOFF, VALID_UUID)
    expect(result).toMatch(/^ONEOFF-/)
  })

  it('throws on invalid prefix', () => {
    expect(() => makeMPaymentId('FOO' as 'DRG', VALID_UUID)).toThrow('Invalid PayFast prefix: FOO')
  })

  it('includes a numeric timestamp at the end', () => {
    const before = Date.now()
    const result = makeMPaymentId(PAYFAST_PREFIX.SUBSCRIPTION, VALID_UUID)
    const after = Date.now()
    const ts = Number(result.split('-').pop())
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })
})

describe('parseMPaymentId', () => {
  it('returns null for empty string', () => {
    expect(parseMPaymentId('')).toBeNull()
  })

  it('returns null for unknown prefix FOO', () => {
    expect(parseMPaymentId(`FOO-${VALID_UUID}-${Date.now()}`)).toBeNull()
  })

  it('returns null when timestamp portion is missing', () => {
    expect(parseMPaymentId(`DRG-${VALID_UUID}`)).toBeNull()
  })

  it('returns null when uuid portion is malformed (not a valid UUID)', () => {
    expect(parseMPaymentId(`DRG-notauuid-${Date.now()}`)).toBeNull()
  })

  it('returns null when there are no dashes at all', () => {
    expect(parseMPaymentId('DRGNODASHES')).toBeNull()
  })

  it('parses a DRG m_payment_id correctly', () => {
    const ts = Date.now()
    const raw = `DRG-${VALID_UUID}-${ts}`
    const parsed = parseMPaymentId(raw)
    expect(parsed).not.toBeNull()
    expect(parsed!.prefix).toBe('DRG')
    expect(parsed!.organizationId).toBe(VALID_UUID)
    expect(parsed!.timestamp).toBe(ts)
    expect(parsed!.raw).toBe(raw)
  })

  it('parses an ADDON m_payment_id correctly', () => {
    const ts = Date.now()
    const raw = `ADDON-${VALID_UUID}-${ts}`
    const parsed = parseMPaymentId(raw)
    expect(parsed).not.toBeNull()
    expect(parsed!.prefix).toBe('ADDON')
  })

  it('parses TOPUP and ONEOFF prefixes', () => {
    const ts = Date.now()
    expect(parseMPaymentId(`TOPUP-${VALID_UUID}-${ts}`)!.prefix).toBe('TOPUP')
    expect(parseMPaymentId(`ONEOFF-${VALID_UUID}-${ts}`)!.prefix).toBe('ONEOFF')
  })
})

describe('makeMPaymentId / parseMPaymentId round-trip', () => {
  it('round-trips for all four prefixes', () => {
    for (const prefix of Object.values(PAYFAST_PREFIX)) {
      const raw = makeMPaymentId(prefix, VALID_UUID)
      const parsed = parseMPaymentId(raw)
      expect(parsed).not.toBeNull()
      expect(parsed!.prefix).toBe(prefix)
      expect(parsed!.organizationId).toBe(VALID_UUID)
    }
  })
})
