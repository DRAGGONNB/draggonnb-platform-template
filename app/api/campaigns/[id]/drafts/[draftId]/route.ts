import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrg } from '@/lib/auth/get-user-org'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; draftId: string }> }
) {
  const { id: campaignId, draftId } = await params
  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Verify campaign ownership
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('organization_id', userOrg.organizationId)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('campaign_drafts')
    .select(
      'id, campaign_id, channel, subject, body_text, body_html, brand_safe, safety_flags, is_approved, regeneration_count'
    )
    .eq('id', draftId)
    .eq('campaign_id', campaignId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }

  return NextResponse.json({ draft: data })
}

// PATCH stub — inline draft edit-on-blur is v3.1 scope
// TODO(v3.1): implement full PATCH to save body_text changes on blur from DraftCard
export async function PATCH(_request: Request) {
  return NextResponse.json({ error: 'Inline draft editing pending v3.1' }, { status: 501 })
}
