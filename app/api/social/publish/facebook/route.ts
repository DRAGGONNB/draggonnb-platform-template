import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { publishToFacebookPage, publishToInstagram, canPublishToInstagram } from '@/lib/social/facebook'

interface PublishRequest {
  account_id: string
  content: string
  image_url?: string
  link_url?: string
}

export async function POST(request: Request) {
  try {
    const { data: userOrg, error: authError } = await getUserOrg()
    if (authError || !userOrg) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: PublishRequest = await request.json()

    if (!body.account_id || !body.content) {
      return NextResponse.json(
        { error: 'account_id and content are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get the social account
    const { data: account, error: fetchError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', body.account_id)
      .eq('organization_id', userOrg.organizationId)
      .single()

    if (fetchError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (account.status !== 'active') {
      return NextResponse.json(
        { error: `Account is ${account.status}. Please reconnect.` },
        { status: 400 }
      )
    }

    // Check token expiry
    if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from('social_accounts')
        .update({ status: 'expired', error_message: 'Token expired' })
        .eq('id', account.id)

      return NextResponse.json(
        { error: 'Token expired. Please reconnect your account.' },
        { status: 401 }
      )
    }

    let result: { id: string }

    if (account.platform === 'facebook') {
      // Publish to Facebook Page
      if (!account.page_id || !account.page_access_token) {
        return NextResponse.json(
          { error: 'No Facebook Page connected to this account' },
          { status: 400 }
        )
      }

      result = await publishToFacebookPage(
        account.page_id,
        account.page_access_token,
        {
          message: body.content,
          link: body.link_url,
        }
      )
    } else if (account.platform === 'instagram') {
      // Publish to Instagram
      if (!body.image_url) {
        return NextResponse.json(
          { error: 'Instagram posts require an image_url' },
          { status: 400 }
        )
      }

      if (!account.page_id || !account.page_access_token) {
        return NextResponse.json(
          { error: 'No Instagram Business account connected' },
          { status: 400 }
        )
      }

      result = await publishToInstagram(
        account.page_id,
        account.page_access_token,
        {
          caption: body.content,
          image_url: body.image_url,
        }
      )
    } else {
      return NextResponse.json(
        { error: `Platform ${account.platform} not supported by this endpoint` },
        { status: 400 }
      )
    }

    // Update last_used_at
    await supabase
      .from('social_accounts')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', account.id)

    return NextResponse.json({
      success: true,
      platform: account.platform,
      platform_post_id: result.id,
    })
  } catch (error) {
    console.error('Facebook publish error:', error)
    const message = error instanceof Error ? error.message : 'Failed to publish'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
