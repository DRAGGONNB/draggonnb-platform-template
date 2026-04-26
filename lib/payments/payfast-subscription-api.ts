// lib/payments/payfast-subscription-api.ts
// Phase 09 BILL-04: subscription amendment via PayFast API.
//
// NOTE: PayFast PUT /subscriptions/{token}/update for amount changes is NOT confirmed
// to work — spike result pending (Plan 09-04). Until confirmed, cancel-and-recreate
// is the ONLY supported amendment path for subscription amount changes.

import { getPayFastConfig, generatePayFastSignature } from './payfast'

const PAYFAST_API_BASE_PROD = 'https://api.payfast.co.za'
const PAYFAST_API_BASE_SANDBOX = 'https://sandbox.payfast.co.za'

function apiBase(): string {
  const cfg = getPayFastConfig()
  return cfg.mode === 'production' ? PAYFAST_API_BASE_PROD : PAYFAST_API_BASE_SANDBOX
}

function buildHeaders(body: Record<string, unknown> = {}): Record<string, string> {
  const cfg = getPayFastConfig()
  const timestamp = new Date().toISOString().replace(/\.\d+Z$/, '+00:00')
  const unsigned: Record<string, string | number> = {
    'merchant-id': cfg.merchantId,
    'version': 'v1',
    'timestamp': timestamp,
    ...body,
  }
  const signature = generatePayFastSignature(
    unsigned as Record<string, string>,
    cfg.passphrase ?? '',
  )
  return {
    'merchant-id': cfg.merchantId,
    'version': 'v1',
    'timestamp': timestamp,
    'signature': signature,
    'Content-Type': 'application/json',
  }
}

/**
 * Cancel a PayFast recurring subscription by token.
 * Replaces the private helper in lib/billing/subscriptions.ts.
 */
export async function cancelSubscription(
  token: string,
): Promise<{ success: boolean; response: unknown }> {
  const url = `${apiBase()}/subscriptions/${token}/cancel`
  const res = await fetch(url, {
    method: 'PUT',
    headers: buildHeaders({}),
  })
  const json = await res.json().catch(() => ({}))
  return { success: res.ok, response: json }
}

/**
 * Fetch a subscription's current state from PayFast.
 */
export async function fetchSubscription(token: string): Promise<unknown> {
  const url = `${apiBase()}/subscriptions/${token}/fetch`
  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders({}),
  })
  if (!res.ok) throw new Error(`[payfast-subscription-api] fetch failed: ${res.status}`)
  return res.json()
}

/**
 * Pause a subscription (stops recurring billing until unpaused).
 */
export async function pauseSubscription(token: string): Promise<void> {
  const url = `${apiBase()}/subscriptions/${token}/pause`
  const res = await fetch(url, { method: 'PUT', headers: buildHeaders({}) })
  if (!res.ok) throw new Error(`[payfast-subscription-api] pause failed: ${res.status}`)
}

/**
 * Unpause a previously paused subscription.
 */
export async function unpauseSubscription(token: string): Promise<void> {
  const url = `${apiBase()}/subscriptions/${token}/unpause`
  const res = await fetch(url, { method: 'PUT', headers: buildHeaders({}) })
  if (!res.ok) throw new Error(`[payfast-subscription-api] unpause failed: ${res.status}`)
}

/**
 * Attempt subscription amount update via PayFast API.
 *
 * CURRENT KNOWLEDGE: PayFast may not support amount changes via /update.
 * See Plan 09-04 spike for confirmation. Returns { supported: false } if PayFast
 * rejects; caller must fall back to cancel-and-recreate flow.
 */
export async function tryUpdateSubscriptionAmount(
  token: string,
  newAmountCents: number,
): Promise<{ supported: boolean; response: unknown }> {
  const url = `${apiBase()}/subscriptions/${token}/update`
  const body = { amount: newAmountCents }
  const res = await fetch(url, {
    method: 'PUT',
    headers: buildHeaders(body),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { supported: res.ok, response: json }
}
