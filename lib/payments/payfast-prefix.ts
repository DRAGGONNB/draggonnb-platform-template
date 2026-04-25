// lib/payments/payfast-prefix.ts
// Phase 09 BILL-06: m_payment_id prefix branching system

export const PAYFAST_PREFIX = {
  SUBSCRIPTION: 'DRG',   // base plan + modules recurring
  ADDON: 'ADDON',        // mid-cycle module add (ad-hoc pro-rate charge)
  TOPUP: 'TOPUP',        // overage pack one-off
  ONEOFF: 'ONEOFF',      // setup fee, other one-off charges
} as const

export type PayFastPrefix = typeof PAYFAST_PREFIX[keyof typeof PAYFAST_PREFIX]

const VALID_PREFIXES = new Set(Object.values(PAYFAST_PREFIX))

export interface ParsedMPaymentId {
  prefix: PayFastPrefix
  organizationId: string
  timestamp: number
  raw: string
}

/**
 * Build a PayFast m_payment_id with prefix, orgId, and millisecond timestamp.
 * Format: {PREFIX}-{uuid}-{timestamp}
 *
 * Note: UUID contains dashes (8-4-4-4-12). The timestamp is appended after
 * a final dash so parseMPaymentId can split on lastIndexOf('-').
 */
export function makeMPaymentId(prefix: PayFastPrefix, organizationId: string): string {
  if (!VALID_PREFIXES.has(prefix)) {
    throw new Error(`Invalid PayFast prefix: ${prefix}`)
  }
  return `${prefix}-${organizationId}-${Date.now()}`
}

/**
 * Parse a PayFast m_payment_id back into its components.
 * Returns null for any input that does not match the expected format.
 *
 * Parsing strategy:
 * - prefix = everything before the first '-'
 * - timestamp = everything after the last '-' (must be a positive integer)
 * - organizationId = everything between first '-' and last '-' (must be a valid UUID)
 */
export function parseMPaymentId(raw: string): ParsedMPaymentId | null {
  if (!raw) return null

  const firstDash = raw.indexOf('-')
  if (firstDash <= 0) return null

  const prefix = raw.slice(0, firstDash)
  if (!VALID_PREFIXES.has(prefix as PayFastPrefix)) return null

  const lastDash = raw.lastIndexOf('-')
  if (lastDash <= firstDash) return null

  const organizationId = raw.slice(firstDash + 1, lastDash)
  const timestampStr = raw.slice(lastDash + 1)
  const timestamp = Number(timestampStr)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null

  // UUID shape check: 8-4-4-4-12 hex groups (case-insensitive)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId)) {
    return null
  }

  return { prefix: prefix as PayFastPrefix, organizationId, timestamp, raw }
}
