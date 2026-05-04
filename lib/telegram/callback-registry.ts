// lib/telegram/callback-registry.ts
// MANIFEST-04: Telegram callback_data registry skeleton.
// Phase 14 grammY refactor consumes buildCallbackPattern + listCallbacksForOrg
// to register inline-keyboard handlers at bot init time.

import type { TelegramCallbackSpec } from '@/lib/modules/types'
import { MODULE_REGISTRY } from '@/lib/modules/registry'

export type CallbackVerb = 'approve' | 'reject' | 'ack'

/**
 * Canonical callback_data format: {verb}:{product}:{resource_id}
 *
 * BUGFIX (Phase 14 smoke): The original 4-segment shape `{verb}:{product}:{action_key}:{UUID}`
 * exceeds Telegram's 64-byte callback_data limit for `damage_charge` (68 bytes). Action key is
 * now derived from the DB row (approval_requests.action_type) by resource_id, which the handler
 * fetches anyway for the atomic stored-proc call. This keeps callback_data ≤54 bytes.
 *
 * E.g. "approve:draggonnb:abc-123-uuid"
 */
export function buildCallbackData(
  verb: CallbackVerb,
  product: string,
  _actionKey: string,
  resourceId: string
): string {
  // _actionKey accepted for backward-compat with callers — intentionally unused.
  return `${verb}:${product}:${resourceId}`
}

/**
 * Returns regex patterns for grammY callbackQuery handlers, one per verb per spec.
 * E.g. ^approve:draggonnb:.+
 */
export function buildCallbackPattern(
  verb: CallbackVerb,
  product: string,
  _actionKey: string
): RegExp {
  return new RegExp(`^${verb}:${product}:.+$`)
}

export interface ResolvedCallback {
  verb: CallbackVerb
  product: string
  /** action_key is no longer in callback_data — must be looked up from DB by resource_id. */
  action_key: ''
  resource_id: string
}

/**
 * Parse incoming callback_data string back into structured form.
 * Returns null on malformed input — handler should ignore.
 */
export function parseCallbackData(data: string): ResolvedCallback | null {
  const parts = data.split(':')
  if (parts.length !== 3) return null
  const [verb, product, resource_id] = parts
  if (verb !== 'approve' && verb !== 'reject' && verb !== 'ack') return null
  return { verb: verb as CallbackVerb, product, action_key: '', resource_id }
}

export interface ListedCallback {
  product: string
  spec: TelegramCallbackSpec
}

export function listCallbacksForOrg(enabledModuleIds: string[]): ListedCallback[] {
  const out: ListedCallback[] = []
  for (const mod of MODULE_REGISTRY) {
    if (!enabledModuleIds.includes(mod.id)) continue
    for (const cb of mod.telegram_callbacks) {
      out.push({ product: mod.product, spec: cb })
    }
  }
  return out
}
