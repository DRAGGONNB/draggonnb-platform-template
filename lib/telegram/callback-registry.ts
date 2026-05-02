// lib/telegram/callback-registry.ts
// MANIFEST-04: Telegram callback_data registry skeleton.
// Phase 14 grammY refactor consumes buildCallbackPattern + listCallbacksForOrg
// to register inline-keyboard handlers at bot init time.

import type { TelegramCallbackSpec } from '@/lib/modules/types'
import { MODULE_REGISTRY } from '@/lib/modules/registry'

export type CallbackVerb = 'approve' | 'reject' | 'ack'

/**
 * Canonical callback_data format: {verb}:{product}:{action_or_task_key}:{resource_id}
 * E.g. "approve:draggonnb:damage_charge:abc-123-uuid"
 */
export function buildCallbackData(
  verb: CallbackVerb,
  product: string,
  actionKey: string,
  resourceId: string
): string {
  return `${verb}:${product}:${actionKey}:${resourceId}`
}

/**
 * Returns regex patterns for grammY callbackQuery handlers, one per verb per spec.
 * E.g. ^approve:draggonnb:damage_charge:.+
 */
export function buildCallbackPattern(
  verb: CallbackVerb,
  product: string,
  actionKey: string
): RegExp {
  return new RegExp(`^${verb}:${product}:${actionKey}:.+$`)
}

export interface ResolvedCallback {
  verb: CallbackVerb
  product: string
  action_key: string
  resource_id: string
}

/**
 * Parse incoming callback_data string back into structured form.
 * Returns null on malformed input — handler should ignore.
 */
export function parseCallbackData(data: string): ResolvedCallback | null {
  const parts = data.split(':')
  if (parts.length !== 4) return null
  const [verb, product, action_key, resource_id] = parts
  if (verb !== 'approve' && verb !== 'reject' && verb !== 'ack') return null
  return { verb: verb as CallbackVerb, product, action_key, resource_id }
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
