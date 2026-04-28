import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { isInNewTenantPeriod } from '@/lib/campaigns/enforcement'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params

  // Auth
  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = userOrg.organizationId
  const supabase = createAdminClient()

  // Verify campaign ownership
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, status, force_review, organization_id')
    .eq('id', campaignId)
    .eq('organization_id', orgId)
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // Kill switch check (inline — DO NOT import from lib/campaigns/kill-switch.ts; built in Plan 11-11)
  const { data: tenantMod } = await supabase
    .from('tenant_modules')
    .select('config')
    .eq('organization_id', orgId)
    .eq('module_id', 'campaigns')
    .maybeSingle()
  type CampaignsConfig = { campaigns?: { kill_switch_active?: boolean } }
  if (((tenantMod?.config as CampaignsConfig | null)?.campaigns?.kill_switch_active)) {
    return NextResponse.json({ error: 'Campaigns are paused for this account' }, { status: 423 })
  }

  // Fetch all drafts for this campaign
  const { data: drafts, error: draftsError } = await supabase
    .from('campaign_drafts')
    .select('id, is_approved, brand_safe')
    .eq('campaign_id', campaignId)

  if (draftsError) {
    return NextResponse.json({ error: 'Failed to load drafts' }, { status: 500 })
  }

  if (!drafts || drafts.length === 0) {
    return NextResponse.json({ error: 'No drafts found for this campaign' }, { status: 422 })
  }

  // Validate all drafts are approved
  const unapprovedDrafts = drafts.filter((d) => !d.is_approved)
  if (unapprovedDrafts.length > 0) {
    return NextResponse.json(
      {
        error: `${unapprovedDrafts.length} draft(s) not yet approved`,
        unapproved: unapprovedDrafts.map((d) => d.id),
      },
      { status: 422 }
    )
  }

  // Brand-safety gate: reject if any draft is explicitly flagged (brand_safe === false)
  // Note: brand_safe === null (not yet checked) is allowed with a warning — tighten in v3.1
  const flaggedDrafts = drafts.filter((d) => d.brand_safe === false)
  if (flaggedDrafts.length > 0) {
    return NextResponse.json(
      {
        error: `${flaggedDrafts.length} draft(s) failed brand safety check. Review and resolve flags before approving.`,
        flagged: flaggedDrafts.map((d) => d.id),
      },
      { status: 422 }
    )
  }

  // 30-day enforcement (CAMP-08 partial)
  const inNewTenantPeriod = await isInNewTenantPeriod(orgId)
  const forceReview = inNewTenantPeriod && !(campaign.force_review as boolean)

  // Status determination
  // If new tenant period (and force_review not already admin-overridden): pending_review
  // Otherwise: scheduled (Plan 11-11 will handle actual pg_cron scheduling)
  const newStatus = forceReview ? 'pending_review' : 'scheduled'
  const nextAction = forceReview ? 'awaiting_review' : 'schedule'

  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('campaigns')
    .update({
      status: newStatus,
      approved_by: userOrg.userId,
      approved_at: now,
      // If in new tenant period and not already forced by admin — set force_review
      force_review: inNewTenantPeriod ? true : (campaign.force_review as boolean),
      updated_at: now,
    })
    .eq('id', campaignId)

  if (updateError) {
    console.error('approve POST: update error', updateError)
    return NextResponse.json({ error: 'Failed to approve campaign' }, { status: 500 })
  }

  return NextResponse.json({ status: newStatus, nextAction })
}
