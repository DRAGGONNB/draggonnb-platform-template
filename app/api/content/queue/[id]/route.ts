import { NextRequest, NextResponse } from 'next/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: userOrg, error } = await getUserOrg()
  if (!userOrg) {
    return NextResponse.json({ error: error || 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { data: item, error: fetchError } = await supabase
    .from('content_queue')
    .select('*')
    .eq('id', id)
    .eq('organization_id', userOrg.organizationId)
    .single()

  if (fetchError || !item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  return NextResponse.json({ item })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: userOrg, error: authError } = await getUserOrg()
  if (!userOrg) {
    return NextResponse.json({ error: authError || 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  let body: {
    action?: 'approve' | 'reject' | 'schedule'
    content?: string
    hashtags?: string[]
    publish_at?: string
    rejection_reason?: string
    layout_data?: Record<string, unknown>
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify ownership
  const { data: existing } = await supabase
    .from('content_queue')
    .select('id, organization_id, status')
    .eq('id', id)
    .eq('organization_id', userOrg.organizationId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}

  if (body.action === 'approve') {
    updates.status = 'approved'
    updates.approved_by = userOrg.userId
    updates.approved_at = new Date().toISOString()
  } else if (body.action === 'reject') {
    updates.status = 'rejected'
    updates.rejection_reason = body.rejection_reason || null
  } else if (body.action === 'schedule') {
    if (!body.publish_at) {
      return NextResponse.json({ error: 'publish_at required for scheduling' }, { status: 400 })
    }
    updates.status = 'scheduled'
    updates.publish_at = body.publish_at
  }

  if (body.content !== undefined) updates.content = body.content
  if (body.hashtags !== undefined) updates.hashtags = body.hashtags
  if (body.publish_at !== undefined && body.action !== 'schedule') updates.publish_at = body.publish_at
  if (body.layout_data !== undefined) updates.layout_data = body.layout_data

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 })
  }

  const { data: updated, error: updateError } = await supabase
    .from('content_queue')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }

  return NextResponse.json({ item: updated })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: userOrg, error: authError } = await getUserOrg()
  if (!userOrg) {
    return NextResponse.json({ error: authError || 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { error: deleteError } = await supabase
    .from('content_queue')
    .delete()
    .eq('id', id)
    .eq('organization_id', userOrg.organizationId)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}
