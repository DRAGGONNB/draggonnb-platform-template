/**
 * Restaurant-specific PayFast link generation for LiveTab bill payments.
 * Extends lib/payments/payfast.ts — reuses generatePayFastSignature.
 */
import { generatePayFastSignature } from '@/lib/payments/payfast'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://draggonnb-platform.vercel.app'

export interface BillPaymentLinkParams {
  // Per-restaurant PayFast credentials (stored in restaurants table)
  merchantId: string
  merchantKey: string
  passphrase?: string
  // Payment details
  billId: string
  payerId: string
  payerToken: string       // bill_payers.payfast_token — unique per slot
  amount: number
  tipAmount?: number
  restaurantSlug: string
  tableLabel: string
  guestName?: string
  sandbox?: boolean
}

export function generateBillPaymentLink(params: BillPaymentLinkParams): string {
  const totalAmount = params.amount + (params.tipAmount ?? 0)

  const formData: Record<string, string> = {
    merchant_id: params.merchantId,
    merchant_key: params.merchantKey,
    return_url: `${APP_URL}/r/${params.restaurantSlug}/paid?ref=${params.payerToken}`,
    cancel_url: `${APP_URL}/r/${params.restaurantSlug}/cancelled`,
    notify_url: `${APP_URL}/api/restaurant/payment/itn`,
    name_first: (params.guestName?.split(' ')[0]) || 'Guest',
    name_last: (params.guestName?.split(' ').slice(1).join(' ')) || '',
    m_payment_id: params.payerToken,
    amount: totalAmount.toFixed(2),
    item_name: `${params.tableLabel} — Bill Payment`.substring(0, 100),
    custom_str1: params.billId,
    custom_str2: params.payerId,
    custom_str3: params.tipAmount?.toFixed(2) ?? '0.00',
  }

  const signature = generatePayFastSignature(formData, params.passphrase)
  formData.signature = signature

  const base = params.sandbox
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process'

  return `${base}?${new URLSearchParams(formData).toString()}`
}

/**
 * Validate an incoming PayFast ITN for restaurant bill payment.
 * Returns validated fields or null on failure.
 */
export function validateBillITN(
  payload: Record<string, string>,
  merchantId: string,
  passphrase?: string
): { billId: string; payerId: string; tipAmount: number; pfPaymentId: string } | null {
  const { signature, ...params } = payload

  // 1. Validate MD5 signature
  const expected = generatePayFastSignature(params, passphrase)
  if (expected !== signature) {
    console.error('[Restaurant ITN] Invalid signature')
    return null
  }

  // 2. Validate merchant ID
  if (params.merchant_id !== merchantId) {
    console.error('[Restaurant ITN] Merchant ID mismatch')
    return null
  }

  // 3. Validate payment status
  if (params.payment_status !== 'COMPLETE') {
    console.error('[Restaurant ITN] Payment not complete:', params.payment_status)
    return null
  }

  return {
    billId: params.custom_str1,
    payerId: params.custom_str2,
    tipAmount: parseFloat(params.custom_str3 ?? '0'),
    pfPaymentId: params.pf_payment_id,
  }
}
