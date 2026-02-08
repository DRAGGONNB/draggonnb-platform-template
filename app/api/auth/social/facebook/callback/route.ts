import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  exchangeFacebookCode,
  getLongLivedToken,
  getFacebookUser,
  getFacebookPages,
} from '@/lib/social/facebook'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const settingsUrl = `${baseUrl}/settings/social`

  // Handle OAuth errors
  if (errorParam) {
    console.error('Facebook OAuth error:', errorParam, searchParams.get('error_description'))
    return NextResponse.redirect(`${settingsUrl}?error=facebook_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}?error=missing_params`)
  }

  try {
    // Verify state for CSRF protection
    const cookieStore = await cookies()
    const storedState = cookieStore.get('fb_oauth_state')?.value
    cookieStore.delete('fb_oauth_state')

    if (state !== storedState) {
      console.error('State mismatch:', { received: state, stored: storedState })
      return NextResponse.redirect(`${settingsUrl}?error=invalid_state`)
    }

    // Verify user is authenticated
    const { data: userOrg, error: authError } = await getUserOrg()
    if (authError || !userOrg) {
      return NextResponse.redirect(`${baseUrl}/login`)
    }

    // Exchange code for token
    const tokenData = await exchangeFacebookCode(code)

    // Get long-lived token (60 days instead of 1-2 hours)
    const longLivedToken = await getLongLivedToken(tokenData.access_token)

    // Get user info
    const fbUser = await getFacebookUser(longLivedToken.access_token)

    // Get user's pages (required for publishing)
    const pages = await getFacebookPages(longLivedToken.access_token)

    if (pages.length === 0) {
      return NextResponse.redirect(`${settingsUrl}?error=no_pages`)
    }

    // For now, connect the first page (could add page selection UI later)
    const primaryPage = pages[0]

    // Calculate token expiry
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + longLivedToken.expires_in)

    // Save to social_accounts via API
    const supabase = await createClient()
    const { error: saveError } = await supabase.from('social_accounts').upsert({
      organization_id: userOrg.organizationId,
      platform: 'facebook',
      platform_user_id: fbUser.id,
      platform_username: fbUser.name,
      platform_display_name: fbUser.name,
      profile_image_url: fbUser.picture?.data?.url,
      access_token: longLivedToken.access_token,
      token_expires_at: expiresAt.toISOString(),
      page_id: primaryPage.id,
      page_name: primaryPage.name,
      page_access_token: primaryPage.access_token,
      scopes: ['pages_manage_posts', 'pages_read_engagement'],
      status: 'active',
      connected_at: new Date().toISOString(),
      created_by: userOrg.userId,
    }, {
      onConflict: 'organization_id,platform,platform_user_id'
    })

    if (saveError) {
      console.error('Error saving Facebook account:', saveError)
      return NextResponse.redirect(`${settingsUrl}?error=save_failed`)
    }

    // Also save Instagram if the page has an IG business account
    if (primaryPage.instagram_business_account) {
      await supabase.from('social_accounts').upsert({
        organization_id: userOrg.organizationId,
        platform: 'instagram',
        platform_user_id: primaryPage.instagram_business_account.id,
        platform_display_name: `${primaryPage.name} (Instagram)`,
        access_token: primaryPage.access_token, // Uses page access token
        page_id: primaryPage.instagram_business_account.id,
        page_name: primaryPage.name,
        page_access_token: primaryPage.access_token,
        scopes: ['instagram_basic', 'instagram_content_publish'],
        status: 'active',
        connected_at: new Date().toISOString(),
        created_by: userOrg.userId,
      }, {
        onConflict: 'organization_id,platform,platform_user_id'
      })
    }

    return NextResponse.redirect(`${settingsUrl}?success=facebook_connected`)
  } catch (error) {
    console.error('Facebook OAuth callback error:', error)
    return NextResponse.redirect(`${settingsUrl}?error=callback_failed`)
  }
}
