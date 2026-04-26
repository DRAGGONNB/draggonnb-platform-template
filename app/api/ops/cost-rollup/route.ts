import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { env } from '@/lib/config/env'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ') || auth.slice(7) !== env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Compute yesterday's UTC window
  const dayStart = new Date()
  dayStart.setUTCDate(dayStart.getUTCDate() - 1)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setUTCDate(dayStart.getUTCDate() + 1)
  const rollupDate = dayStart.toISOString().slice(0, 10) // YYYY-MM-DD for rollup_date

  // Fetch all org IDs (no test-org filter — diagnostics in 09-05 handle classification;
  // rolling up all orgs is harmless and produces zero rows for inactive ones)
  const { data: orgs, error: orgsErr } = await supabase
    .from('organizations')
    .select('id')

  if (orgsErr) {
    return NextResponse.json({ error: orgsErr.message }, { status: 500 })
  }

  let processed = 0
  let skipped = 0
  for (const org of orgs ?? []) {
    const { data: aggRows, error: aggErr } = await supabase.rpc('aggregate_org_day_cost', {
      p_org_id: org.id,
      p_day_start: dayStart.toISOString(),
      p_day_end: dayEnd.toISOString(),
    })

    if (aggErr) {
      console.error('[cost-rollup] aggregate_org_day_cost failed', { orgId: org.id, err: aggErr.message })
      continue
    }

    const agg = (aggRows as unknown as Array<{
      total_cost_zar_cents: number
      total_input_tokens: number
      total_output_tokens: number
      total_cache_read_tokens: number
      total_cache_write_tokens: number
      call_count: number
      failed_call_count: number
    }>)?.[0]

    if (!agg || agg.call_count === 0) {
      skipped++
      continue
    }

    // Idempotent UPSERT into canonical daily_cost_rollup shape (09-01 migration 27)
    const { error: upsertErr } = await supabase.from('daily_cost_rollup').upsert({
      organization_id: org.id,
      rollup_date: rollupDate,
      total_cost_zar_cents: agg.total_cost_zar_cents,
      total_input_tokens: agg.total_input_tokens,
      total_output_tokens: agg.total_output_tokens,
      total_cache_read_tokens: agg.total_cache_read_tokens,
      total_cache_write_tokens: agg.total_cache_write_tokens,
      call_count: agg.call_count,
      failed_call_count: agg.failed_call_count,
      rolled_up_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,rollup_date' })

    if (upsertErr) {
      console.error('[cost-rollup] upsert failed', { orgId: org.id, err: upsertErr.message })
      continue
    }
    processed++
  }

  return NextResponse.json({
    ok: true,
    rollup_date: rollupDate,
    orgs_processed: processed,
    orgs_skipped: skipped,
    timestamp: new Date().toISOString(),
  })
}
