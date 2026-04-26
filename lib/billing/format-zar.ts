/**
 * ZAR currency formatting helpers.
 *
 * formatZAR — whole-rand display (e.g. R599) for header pricing tiles.
 * formatZARDecimal — two-decimal display (e.g. R688.85) for VAT-inclusive
 *   totals and line-item subtotals.
 *
 * All inputs are integer cents. Uses en-ZA locale for thousands separators.
 */

export function formatZAR(cents: number): string {
  const rands = cents / 100
  return `R${rands.toLocaleString('en-ZA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

export function formatZARDecimal(cents: number): string {
  return `R${(cents / 100).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
