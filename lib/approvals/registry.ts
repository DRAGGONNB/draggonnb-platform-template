// lib/approvals/registry.ts
// MANIFEST-05: Approval action-type registry consumed by Phase 14 spine.
// Phase 13 ships the registry + lookup API; Phase 14 ships the handlers.

import type { ApprovalActionSpec } from '@/lib/modules/types'
import { getAllApprovalActions, MODULE_REGISTRY } from '@/lib/modules/registry'

/**
 * Qualified action key format: "{product}.{action_type}"
 * E.g. "draggonnb.damage_charge", "trophy.quota_change"
 * Resolves uniqueness across products (D2: per-product memberships, no role auto-translate).
 */
export function buildQualifiedKey(product: string, action_type: string): string {
  return `${product}.${action_type}`
}

export class ApprovalActionRegistry {
  private handlers: Map<string, ApprovalActionSpec & { product: string }> = new Map()

  constructor(enabledModuleIds: string[]) {
    const actions = getAllApprovalActions(enabledModuleIds)
    // We need product context — lookup the manifest each action belongs to
    for (const action of actions) {
      const ownerManifest = MODULE_REGISTRY.find(m => m.approval_actions.some(a => a.action_type === action.action_type))
      if (!ownerManifest) continue
      const qualifiedKey = buildQualifiedKey(ownerManifest.product, action.action_type)
      this.handlers.set(qualifiedKey, { ...action, product: ownerManifest.product })
    }
  }

  getHandler(qualifiedKey: string): (ApprovalActionSpec & { product: string }) | undefined {
    return this.handlers.get(qualifiedKey)
  }

  listAll(): Array<ApprovalActionSpec & { product: string; qualifiedKey: string }> {
    return Array.from(this.handlers.entries()).map(([qualifiedKey, spec]) => ({ ...spec, qualifiedKey }))
  }

  /**
   * Phase 14 will call this at app startup to fail-fast if any handler_path
   * does not resolve to a real file. Phase 13 ships the function but does NOT
   * call it — handler files don't exist yet.
   */
  assertAllHandlersResolvable(): void {
    for (const [key, spec] of this.handlers) {
      try {
        // require.resolve only available in Node runtime, not edge.
        // Phase 14 will run this at server boot only.
        require.resolve(spec.handler_path)
      } catch {
        throw new Error(
          `ApprovalActionRegistry: handler not found for action "${key}". ` +
          `handler_path="${spec.handler_path}" could not be resolved. ` +
          `Create the handler file before shipping this module's manifest.`
        )
      }
    }
  }
}
