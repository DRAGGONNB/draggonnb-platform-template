/**
 * VAT-inclusive pricing for South African ZAR amounts.
 *
 * 15% VAT is the standard SA rate. All math is integer cents — never float.
 *
 * BILL-09 spec: pricing UI must surface a VAT-inclusive ZAR amount with a clear
 * "incl. 15% VAT" line. This module is the single source of truth for the
 * formula, used by /pricing, signup confirmation, and any future receipts.
 */

const VAT_RATE_BASIS_POINTS = 1500 // 15.00% in basis points (100 bp = 1%)

/**
 * Convert an ex-VAT cent amount to a VAT-inclusive cent amount.
 *
 * Example: vatInclusivePrice(59900) -> 68885 (R599 ex -> R688.85 inc)
 *
 * Math.round half-up semantics. Operates on integers so we never carry
 * float drift; the multiply (cents * 1.15) only briefly leaves integer space
 * during the rounding step.
 */
export function vatInclusivePrice(exclusiveZarCents: number): number {
  return Math.round(exclusiveZarCents * (1 + VAT_RATE_BASIS_POINTS / 10000))
}

/**
 * The VAT-only portion in cents (inclusive - exclusive).
 * Useful for invoice line breakdowns.
 */
export function vatPortion(exclusiveZarCents: number): number {
  return vatInclusivePrice(exclusiveZarCents) - exclusiveZarCents
}

/** Canonical UI string for the VAT-inclusive label. */
export const VAT_LABEL = 'incl. 15% VAT'
