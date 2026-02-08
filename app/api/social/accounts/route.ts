import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import type { SocialAccount, ConnectAccountRequest, SocialPlatform } from '@/lib/social/types'

export async function GET() {
  try {
    const { data: userOrg, error: authError } = await getUserOrg()
    if (authError || !userOrg) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: accounts, error } = await supabase
      .from('social_accounts')
      .select('id, platform, platform_username, platform_display_name, profile_image_url, page_name, status, connected_at, last_used_at, error_message')
      .eq('organization_id', userOrg.organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching social accounts:', error)
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    return NextResponse.json({ accounts: accounts || [] })
  } catch (error) {
    console.error('Social accounts GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { data: userOrg, error: authError } = await getUserOrg()
    if (authError || !userOrg) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ConnectAccountRequest = await request.json()

    // Validate required fields
    if (!body.platform || !body.access_token || !body.platform_user_id) {
      return NextResponse.json(
        { error: 'platform, access_token, and platform_user_id are required' },
        { status: 400 }
      )
    }

    const validPlatforms: SocialPlatform[] = ['facebook', 'instagram', 'linkedin', 'twitter']
    if (!validPlatforms.includes(body.platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Upsert to handle reconnection of same account
    const { data: account, error } = await supabase
      .from('social_accounts')
      .upsert({
        organization_id: userOrg.organizationId,
        platform: body.platform,
        platform_user_id: body.platform_user_id,
        platform_username: body.platform_username,
        platform_display_name: body.platform_display_name,
        profile_image_url: body.profile_image_url,
        access_token: body.access_token,
        refresh_token: body.refresh_token,
        token_expires_at: body.token_expires_at,
        page_id: body.page_id,
        page_name: body.page_name,
        page_access_token: body.page_access_token,
        scopes: body.scopes,
        status: 'active',
        error_message: null,
        connected_at: new Date().toISOString(),
        created_by: userOrg.userId,
      }, {
        onConflict: 'organization_id,platform,platform_user_id'
      })
      .select('id, platform, platform_username, platform_display_name, status')
      .single()

    if (error) {
      console.error('Error creating social account:', error)
      return NextResponse.json({ error: 'Failed to save account' }, { status: 500 })
    }

    return NextResponse.json({ account }, { status: 201 })
  } catch (error) {
    console.error('Social accounts POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
