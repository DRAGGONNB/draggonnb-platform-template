// Phase 11: GET /api/campaigns/runs/[runId] — run detail with items (CAMP-05).
// Used by the run detail client component for auto-refresh.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrg } from '@/lib/auth/get-user-org'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params

  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = userOrg.organizationId
  const supabase = createAdminClient()

  // Load run — must belong to caller's org
  const { data: run, error: runError } = await supabase
    .from('campaign_runs')
    .select(`
      id,
      status,
      scheduled_at,
      started_at,
      completed_at,
      items_total,
      items_sent,
      items_failed,
      error_message,
      campaign_id,
      campaigns (
        name
      )
    `)
    .eq('id', runId)
    .eq('organization_id', orgId)
    .single()

  if (runError || !run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  // Load run items
  const { data: items, error: itemsError } = await supabase
    .from('campaign_run_items')
    .select(`
      id,
      channel,
      recipient_ref,
      status,
      provider_message_id,
      published_url,
      sent_at,
      verified_at,
      error_code,
      error_message
    `)
    .eq('run_id', runId)
    .order('created_at', { ascending: true })

  if (itemsError) {
    return NextResponse.json({ error: 'Failed to load run items' }, { status: 500 })
  }

  return NextResponse.json({ run: { ...run, items: items ?? [] } })
}
