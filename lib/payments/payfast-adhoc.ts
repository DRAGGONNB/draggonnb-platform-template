// lib/payments/payfast-adhoc.ts
// Phase 09 BILL-03: one-off setup fee + top-up + addon pro-rate charges via PayFast ad-hoc API.
//
// Amount unit: INTEGER CENTS — confirmed via Phase 13 Plan 01 sandbox spike (2026-05-02).
// Spike Call A (amount=250.00 rands) → HTTP 400 "Integer Expected".
// Spike Call B (amount=25000 cents) → HTTP 200 success.
// See .planning/phases/13-cross-product-foundation/13-PAYFAST-SANDBOX-SPIKE.md
//
// API base URL: api.payfast.co.za for BOTH sandbox and production.
// Sandbox mode is enabled via ?testing=true query param (NOT a separate subdomain).
// Using sandbox.payfast.co.za for API calls returns HTTP 405 Method Not Allowed.

import { getPayFastConfig, generatePayFastApiSignature } from './payfast'
import { makeMPaymentId, PAYFAST_PREFIX, type PayFastPrefix } from './payfast-prefix'

const PAYFAST_API_BASE = 'https://api.payfast.co.za'

interface AdhocChargeArgs {
  subscriptionToken: string
  organizationId: string
  amountCents: number
  itemName: string
  itemDescription?: string
  prefix: Extract<PayFastPrefix, 'ADDON' | 'TOPUP' | 'ONEOFF'>
}

/**
 * Charge an ad-hoc amount against an existing PayFast subscription token.
 * Used for setup fees (ONEOFF-), overage packs (TOPUP-), and mid-cycle module adds (ADDON-).
 *
 * Returns the mPaymentId used so the caller can store it for ITN reconciliation.
 */
export async function chargeAdhoc(
  args: AdhocChargeArgs,
): Promise<{ success: boolean; mPaymentId: string; response: unknown }> {
  const cfg = getPayFastConfig()
  const mPaymentId = makeMPaymentId(args.prefix, args.organizationId)
  const timestamp = new Date().toISOString().replace(/\.\d+Z$/, '+00:00')

  // Amount unit: INTEGER CENTS — confirmed via Phase 13 Plan 01 sandbox spike (2026-05-02).
  // Send raw integer cents. Do NOT divide by 100.
  // See .planning/phases/13-cross-product-foundation/13-PAYFAST-SANDBOX-SPIKE.md
  const amountStr = String(args.amountCents)

  const body = {
    amount: amountStr,
    item_name: args.itemName,
    item_description: args.itemDescription ?? args.itemName,
    m_payment_id: mPaymentId,
  }

  const unsigned = {
    'merchant-id': cfg.merchantId,
    'version': 'v1',
    'timestamp': timestamp,
    ...body,
  }
  // API signature uses alphabetical ksort + passphrase as a regular sorted field.
  // This is DIFFERENT from form signature (insertion order, passphrase appended last).
  // See generatePayFastApiSignature in payfast.ts.
  const signature = generatePayFastApiSignature(
    unsigned as Record<string, string>,
    cfg.passphrase ?? '',
  )

  // Sandbox mode via ?testing=true; production omits the param.
  const testingParam = cfg.mode === 'sandbox' ? '?testing=true' : ''
  const url = `${PAYFAST_API_BASE}/subscriptions/${args.subscriptionToken}/adhoc${testingParam}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'merchant-id': cfg.merchantId,
      'version': 'v1',
      'timestamp': timestamp,
      'signature': signature,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = await res.json().catch(() => ({}))
  return { success: res.ok, mPaymentId, response: json }
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

/** Charge the one-off platform setup fee. */
export const chargeSetupFee = (
  subscriptionToken: string,
  organizationId: string,
  amountCents: number,
) =>
  chargeAdhoc({
    subscriptionToken,
    organizationId,
    amountCents,
    itemName: 'DraggonnB Platform Setup Fee',
    prefix: PAYFAST_PREFIX.ONEOFF,
  })

/** Charge an overage credit pack (e.g. extra posts, AI calls, emails). */
export const chargeOveragePack = (
  subscriptionToken: string,
  organizationId: string,
  amountCents: number,
  packName: string,
) =>
  chargeAdhoc({
    subscriptionToken,
    organizationId,
    amountCents,
    itemName: packName,
    prefix: PAYFAST_PREFIX.TOPUP,
  })

/** Charge a pro-rated amount when a module is added mid-cycle. */
export const chargeAddonProRate = (
  subscriptionToken: string,
  organizationId: string,
  amountCents: number,
  addonName: string,
) =>
  chargeAdhoc({
    subscriptionToken,
    organizationId,
    amountCents,
    itemName: `Pro-rated charge: ${addonName}`,
    prefix: PAYFAST_PREFIX.ADDON,
  })
