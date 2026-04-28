/** @vitest-environment node */

import { describe, it, expect } from 'vitest'
import { vatInclusivePrice, vatPortion, VAT_LABEL } from '@/lib/billing/vat'

/**
 * BILL-09 — VAT-inclusive pricing math.
 *
 * Pure integer-cent math. Math.round half-up semantics.
 * The pricing UI relies on these numbers — any rounding drift here
 * propagates to invoices, so the test surface is exhaustive.
 */
describe('BILL-09 VAT-inclusive pricing', () => {
  it('R599 ex-VAT -> R688.85 inc-VAT (Core plan)', () => {
    expect(vatInclusivePrice(59900)).toBe(68885)
  })

  it('R1,199 ex-VAT -> R1,378.85 inc-VAT (Vertical plan)', () => {
    expect(vatInclusivePrice(119900)).toBe(137885)
  })

  it('R0 -> R0 (boundary)', () => {
    expect(vatInclusivePrice(0)).toBe(0)
  })

  it('uses Math.round half-up — 333 cents -> 383 (not 382)', () => {
    // 333 * 1.15 = 382.95 -> rounds to 383
    expect(vatInclusivePrice(333)).toBe(383)
  })

  it('R1,499 setup fee ex-VAT -> R1,723.85 inc-VAT', () => {
    expect(vatInclusivePrice(149900)).toBe(172385)
  })

  it('R599 + R399 (finance_ai addon) ex-VAT -> R1,147.70 inc-VAT', () => {
    // Combined Core + Finance-AI subtotal
    const subtotalEx = 59900 + 39900 // R998 ex
    expect(vatInclusivePrice(subtotalEx)).toBe(114770) // R1,147.70 inc
  })

  it('returns integer (no float remainder)', () => {
    const result = vatInclusivePrice(59900)
    expect(Number.isInteger(result)).toBe(true)
  })

  it('vatPortion = inclusive - exclusive (R599)', () => {
    expect(vatPortion(59900)).toBe(8985)
  })

  it('vatPortion of R0 is R0', () => {
    expect(vatPortion(0)).toBe(0)
  })

  it('VAT_LABEL is the canonical UI text', () => {
    expect(VAT_LABEL).toBe('incl. 15% VAT')
  })
})
