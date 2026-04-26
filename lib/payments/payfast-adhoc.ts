// lib/payments/payfast-adhoc.ts
// Phase 09 BILL-03: one-off setup fee + top-up + addon pro-rate charges via PayFast ad-hoc API.
//
// NOTE: Cents vs rands for `amount` field is NOT confirmed against PayFast sandbox
// — see Plan 09-04 spike. This implementation sends RANDS with 2 decimals,
// matching existing form-based subscription integration pattern.

import { getPayFastConfig, generatePayFastSignature } from './payfast'
import { makeMPaymentId, PAYFAST_PREFIX, type PayFastPrefix } from './payfast-prefix'

const PAYFAST_API_BASE_PROD = 'https://api.payfast.co.za'
const PAYFAST_API_BASE_SANDBOX = 'https://sandbox.payfast.co.za'

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
  const base = cfg.mode === 'production' ? PAYFAST_API_BASE_PROD : PAYFAST_API_BASE_SANDBOX
  const mPaymentId = makeMPaymentId(args.prefix, args.organizationId)
  const timestamp = new Date().toISOString().replace(/\.\d+Z$/, '+00:00')

  // Send rands with 2 decimal places (spike pending in 09-04 to confirm unit)
  const amountRands = (args.amountCents / 100).toFixed(2)

  const body = {
    amount: amountRands,
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
  const signature = generatePayFastSignature(
    unsigned as Record<string, string>,
    cfg.passphrase ?? '',
  )

  const url = `${base}/subscriptions/${args.subscriptionToken}/adhoc`
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
