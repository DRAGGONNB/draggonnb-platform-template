// lib/billing/composition.ts
// Phase 09 BILL-02/03/04/05: base plan + modules/add-ons composition engine

import { createAdminClient } from '@/lib/supabase/admin'
import { getPlan } from '@/lib/billing/plans'
import { getAddon } from '@/lib/billing/addons-catalog'

export interface CompositionLineItem {
  kind: 'base_plan' | 'module' | 'overage_pack' | 'setup_fee'
  id: string
  display_name: string
  price_zar_cents: number
  billing_cycle: 'monthly' | 'one_off'
  payfast_item_code: string
}

export interface Composition {
  base_plan_id: string
  addon_ids: string[]
  line_items: CompositionLineItem[]
  monthly_total_zar_cents: number   // sum of all monthly line items
  setup_fee_zar_cents: number       // separate one-off charge
  snapshot_at: string               // ISO timestamp
}

/**
 * Pure function — no DB writes. Computes a Composition given a base plan + addon list.
 *
 * Errors: throws if basePlanId is unknown, or any addonId is missing or inactive.
 * Note: setup_fee in addon_ids is silently skipped (handled via options.includeSetupFee).
 */
export async function compose(
  basePlanId: string,
  addonIds: string[] = [],
  options: { includeSetupFee?: boolean } = {},
): Promise<Composition> {
  const { data: plan, error: planError } = await getPlan(basePlanId)
  if (planError || !plan) throw new Error(`[compose] Unknown base plan: ${basePlanId}`)

  const lineItems: CompositionLineItem[] = [{
    kind: 'base_plan',
    id: plan.id,
    display_name: plan.display_name,
    price_zar_cents: plan.price_zar,
    billing_cycle: 'monthly',
    payfast_item_code: plan.payfast_item_code ?? `DRG-${plan.id.toUpperCase()}`,
  }]

  for (const addonId of addonIds) {
    const addon = await getAddon(addonId)
    if (!addon) throw new Error(`[compose] Unknown addon: ${addonId}`)
    if (!addon.is_active) throw new Error(`[compose] Inactive addon: ${addonId}`)
    // setup_fee in addon_ids is handled via options.includeSetupFee, skip here
    if (addon.kind === 'setup_fee') continue
    lineItems.push({
      kind: addon.kind,
      id: addon.id,
      display_name: addon.display_name,
      price_zar_cents: addon.price_zar_cents,
      billing_cycle: addon.billing_cycle,
      payfast_item_code: addon.payfast_item_code,
    })
  }

  const monthlyTotal = lineItems
    .filter(li => li.billing_cycle === 'monthly')
    .reduce((sum, li) => sum + li.price_zar_cents, 0)

  let setupFee = 0
  if (options.includeSetupFee) {
    const fee = await getAddon('setup_fee')
    if (fee && fee.is_active) {
      setupFee = fee.price_zar_cents
      lineItems.push({
        kind: 'setup_fee',
        id: fee.id,
        display_name: fee.display_name,
        price_zar_cents: fee.price_zar_cents,
        billing_cycle: 'one_off',
        payfast_item_code: fee.payfast_item_code,
      })
    }
  }

  return {
    base_plan_id: basePlanId,
    addon_ids: addonIds,
    line_items: lineItems,
    monthly_total_zar_cents: monthlyTotal,
    setup_fee_zar_cents: setupFee,
    snapshot_at: new Date().toISOString(),
  }
}

/**
 * Closes any existing open subscription_composition row for the org (sets effective_to = now),
 * inserts a new open row reflecting this composition, and updates
 * organizations.billing_plan_snapshot for fast webhook amount validation.
 */
export async function recordComposition(
  organizationId: string,
  composition: Composition,
  reason: 'subscribe' | 'addon_added' | 'addon_removed' | 'plan_change',
): Promise<void> {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Close any existing open composition (effective_to IS NULL)
  await supabase
    .from('subscription_composition')
    .update({ effective_to: now })
    .eq('organization_id', organizationId)
    .is('effective_to', null)

  // Insert new current composition
  const { error } = await supabase
    .from('subscription_composition')
    .insert({
      organization_id: organizationId,
      base_plan_id: composition.base_plan_id,
      addon_ids: composition.addon_ids,
      monthly_total_zar_cents: composition.monthly_total_zar_cents,
      setup_fee_zar_cents: composition.setup_fee_zar_cents,
      effective_from: now,
      reason,
    })
  if (error) throw new Error(`[recordComposition] ${error.message}`)

  // Update organizations.billing_plan_snapshot for fast webhook lookup
  await supabase
    .from('organizations')
    .update({ billing_plan_snapshot: composition })
    .eq('id', organizationId)
}
