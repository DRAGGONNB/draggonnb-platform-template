// Backfill organizations.billing_plan_snapshot for rows where snapshot IS NULL.
// Idempotent. Safe to run multiple times — only updates rows where snapshot is NULL.
//
// Run: pnpm tsx scripts/migrations/phase-09/backfill-billing-plan-snapshot.ts
//
// Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in environment.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface OrgRow {
  id: string
  name: string
  plan_id: string | null
}

interface PlanRow {
  id: string
  price_zar: number
  limits: Record<string, number>
  features: string[]
  payfast_item_code: string | null
  display_name: string
}

async function main() {
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id, plan_id, name')
    .is('billing_plan_snapshot', null)
  if (error) throw error

  const orgList = (orgs ?? []) as OrgRow[]
  console.log(`Found ${orgList.length} orgs missing billing_plan_snapshot`)

  if (orgList.length === 0) {
    console.log('All orgs already have billing_plan_snapshot. Nothing to do.')
    return
  }

  let updated = 0
  let skipped = 0

  for (const org of orgList) {
    const planId = org.plan_id ?? 'core'

    const { data: planRaw, error: planError } = await supabase
      .from('billing_plans')
      .select('id, price_zar, limits, features, payfast_item_code, display_name')
      .eq('id', planId)
      .single()

    if (planError || !planRaw) {
      console.warn(`[skip] org ${org.id} (${org.name}) — plan "${planId}" not found in billing_plans`)
      skipped++
      continue
    }

    const plan = planRaw as PlanRow

    const snapshot = {
      base_plan_id: plan.id,
      addon_ids: [] as string[],
      line_items: [
        {
          kind: 'base_plan',
          id: plan.id,
          display_name: plan.display_name,
          price_zar_cents: plan.price_zar,
          billing_cycle: 'monthly',
          payfast_item_code: plan.payfast_item_code ?? `DRG-${plan.id.toUpperCase()}`,
        },
      ],
      monthly_total_zar_cents: plan.price_zar,
      setup_fee_zar_cents: 0,
      snapshot_at: new Date().toISOString(),
      backfilled: true,   // flag so we can identify backfilled vs live-composed snapshots
    }

    const { error: upErr } = await supabase
      .from('organizations')
      .update({ billing_plan_snapshot: snapshot })
      .eq('id', org.id)

    if (upErr) {
      console.error(`[fail] org ${org.id} (${org.name}):`, upErr.message)
      continue
    }

    updated++
    console.log(`[ok] org ${org.id} (${org.name}) → plan=${plan.id} monthly_total=${plan.price_zar / 100} ZAR`)
  }

  console.log(`\nDone. Updated=${updated}, Skipped=${skipped}, Total orgs without snapshot=${orgList.length}`)
}

main().catch(err => {
  console.error('[fatal]', err)
  process.exit(1)
})
