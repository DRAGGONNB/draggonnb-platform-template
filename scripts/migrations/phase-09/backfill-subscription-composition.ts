// Insert a baseline subscription_composition row for every org that does not have
// an open one (effective_to IS NULL). Idempotent.
//
// Run: pnpm tsx scripts/migrations/phase-09/backfill-subscription-composition.ts
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
}

async function main() {
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id, plan_id, name')
  if (error) throw error

  const orgList = (orgs ?? []) as OrgRow[]
  console.log(`Found ${orgList.length} total orgs`)

  let inserted = 0
  let skipped = 0
  let failed = 0

  for (const org of orgList) {
    // Check if an open composition already exists for this org
    const { data: existing, error: existErr } = await supabase
      .from('subscription_composition')
      .select('id')
      .eq('organization_id', org.id)
      .is('effective_to', null)
      .maybeSingle()

    if (existErr) {
      console.error(`[fail] checking org ${org.id}:`, existErr.message)
      failed++
      continue
    }

    if (existing) {
      skipped++
      continue
    }

    // Fetch the plan to get current price
    const planId = org.plan_id ?? 'core'
    const { data: planRaw, error: planErr } = await supabase
      .from('billing_plans')
      .select('id, price_zar')
      .eq('id', planId)
      .single()

    if (planErr || !planRaw) {
      console.warn(`[skip] org ${org.id} (${org.name}) — plan "${planId}" not found`)
      failed++
      continue
    }

    const plan = planRaw as PlanRow

    const { error: insErr } = await supabase
      .from('subscription_composition')
      .insert({
        organization_id: org.id,
        base_plan_id: plan.id,
        addon_ids: [],
        monthly_total_zar_cents: plan.price_zar,
        setup_fee_zar_cents: 0,
        effective_from: new Date().toISOString(),
        reason: 'subscribe',
        // effective_to NULL = open composition
      })

    if (insErr) {
      console.error(`[fail] org ${org.id} (${org.name}):`, insErr.message)
      failed++
      continue
    }

    inserted++
    console.log(`[ok] composition for org ${org.id} (${org.name}) → plan=${plan.id} monthly_total=${plan.price_zar / 100} ZAR`)
  }

  console.log(`\nDone. Inserted=${inserted}, Skipped=${skipped}, Failed=${failed}, Total=${orgList.length}`)
}

main().catch(err => {
  console.error('[fatal]', err)
  process.exit(1)
})
