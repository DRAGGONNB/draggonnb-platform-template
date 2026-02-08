import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrg } from '@/lib/auth/get-user-org'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { data: userOrg, error: authError } = await getUserOrg()
    if (authError || !userOrg) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = await createClient()

    // Delete only if belongs to user's organization
    const { error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('id', id)
      .eq('organization_id', userOrg.organizationId)

    if (error) {
      console.error('Error deleting social account:', error)
      return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Social accounts DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { data: userOrg, error: authError } = await getUserOrg()
    if (authError || !userOrg) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = await createClient()

    const { data: account, error } = await supabase
      .from('social_accounts')
      .select('id, platform, platform_username, platform_display_name, profile_image_url, page_name, status, connected_at, last_used_at, error_message')
      .eq('id', id)
      .eq('organization_id', userOrg.organizationId)
      .single()

    if (error || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Social account GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
