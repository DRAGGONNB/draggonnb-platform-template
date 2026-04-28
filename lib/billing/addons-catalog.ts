// lib/billing/addons-catalog.ts
// Phase 09 BILL-02: reads billing_addons_catalog table (seeded in migration 24).

import { createAdminClient } from '@/lib/supabase/admin'

export interface BillingAddon {
  id: string
  display_name: string
  description: string | null
  kind: 'module' | 'overage_pack' | 'setup_fee'
  price_zar_cents: number
  billing_cycle: 'monthly' | 'one_off'
  quantity_unit: string | null
  quantity_value: number | null
  min_tier: string | null
  is_active: boolean
  sort_order: number
  payfast_item_code: string
}

export async function getAddonsCatalog(): Promise<BillingAddon[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('billing_addons_catalog')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(`[addons-catalog] ${error.message}`)
  return (data ?? []) as BillingAddon[]
}

export async function getAddon(id: string): Promise<BillingAddon | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('billing_addons_catalog')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`[addons-catalog] ${error.message}`)
  return (data as BillingAddon) ?? null
}

export async function getActiveModules(): Promise<BillingAddon[]> {
  const all = await getAddonsCatalog()
  return all.filter(a => a.kind === 'module')
}

export async function getSetupFee(): Promise<BillingAddon | null> {
  return getAddon('setup_fee')
}
