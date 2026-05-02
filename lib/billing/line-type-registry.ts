// lib/billing/line-type-registry.ts
// MANIFEST-06: Billing line-type validator consumed by Phase 15 invoice-service.ts.
// Phase 15's addInvoiceLine() will call validateBillingLineType() before INSERT.

import type { BillingLineTypeSpec } from '@/lib/modules/types'
import { MODULE_REGISTRY } from '@/lib/modules/registry'

export interface ResolvedLineType extends BillingLineTypeSpec {
  source_product: 'draggonnb' | 'trophy'
}

export function listLineTypesForOrg(enabledModuleIds: string[]): ResolvedLineType[] {
  const out: ResolvedLineType[] = []
  for (const mod of MODULE_REGISTRY) {
    if (!enabledModuleIds.includes(mod.id)) continue
    for (const lt of mod.billing_line_types) {
      out.push({ ...lt, source_product: mod.product })
    }
  }
  return out
}

/**
 * Returns true if (sourceProduct, sourceType) is declared in any active module's manifest.
 * Phase 15's addInvoiceLine() rejects unknown pairs to prevent silent data corruption.
 */
export function validateBillingLineType(
  sourceProduct: string,
  sourceType: string,
  enabledModuleIds: string[]
): boolean {
  return listLineTypesForOrg(enabledModuleIds).some(
    lt => lt.source_product === sourceProduct && lt.source_type === sourceType
  )
}

export function lookupLineType(
  sourceProduct: string,
  sourceType: string,
  enabledModuleIds: string[]
): ResolvedLineType | undefined {
  return listLineTypesForOrg(enabledModuleIds).find(
    lt => lt.source_product === sourceProduct && lt.source_type === sourceType
  )
}
