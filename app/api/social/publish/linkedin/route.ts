import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { publishToLinkedIn } from '@/lib/social/linkedin'

interface PublishRequest {
  account_id: string
  content: string
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

    // LinkedIn has a 3000 character limit for posts
    if (body.content.length > 3000) {
      return NextResponse.json(
        { error: 'Content exceeds LinkedIn 3000 character limit' },
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

    if (account.platform !== 'linkedin') {
      return NextResponse.json(
        { error: 'This endpoint only supports LinkedIn accounts' },
        { status: 400 }
      )
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

    // Get author URN from page_id field
    const authorUrn = account.page_id
    if (!authorUrn) {
      return NextResponse.json(
        { error: 'Account missing author URN. Please reconnect.' },
        { status: 400 }
      )
    }

    // Publish to LinkedIn
    const result = await publishToLinkedIn(
      account.access_token,
      authorUrn,
      {
        text: body.content,
        link: body.link_url,
      }
    )

    // Update last_used_at
    await supabase
      .from('social_accounts')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', account.id)

    return NextResponse.json({
      success: true,
      platform: 'linkedin',
      platform_post_id: result.id,
    })
  } catch (error) {
    console.error('LinkedIn publish error:', error)

    const message = error instanceof Error ? error.message : 'Failed to publish'

    // Check for common LinkedIn API errors
    if (message.includes('401') || message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'LinkedIn authorization failed. Please reconnect your account.' },
        { status: 401 }
      )
    }

    if (message.includes('403') || message.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'LinkedIn permission denied. Your app may need additional access.' },
        { status: 403 }
      )
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
