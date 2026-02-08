import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  exchangeLinkedInCode,
  getLinkedInUser,
  formatLinkedInUrn,
} from '@/lib/social/linkedin'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const settingsUrl = `${baseUrl}/settings/social`

  // Handle OAuth errors
  if (errorParam) {
    console.error('LinkedIn OAuth error:', errorParam, errorDescription)
    return NextResponse.redirect(`${settingsUrl}?error=linkedin_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}?error=missing_params`)
  }

  try {
    // Verify state for CSRF protection
    const cookieStore = await cookies()
    const storedState = cookieStore.get('li_oauth_state')?.value
    cookieStore.delete('li_oauth_state')

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
    const tokenData = await exchangeLinkedInCode(code)

    // Get user info
    const liUser = await getLinkedInUser(tokenData.access_token)

    // Calculate token expiry
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in)

    // Format the author URN for posting
    const authorUrn = formatLinkedInUrn(liUser.sub)

    // Save to social_accounts
    const supabase = await createClient()
    const { error: saveError } = await supabase.from('social_accounts').upsert({
      organization_id: userOrg.organizationId,
      platform: 'linkedin',
      platform_user_id: liUser.sub,
      platform_username: liUser.email,
      platform_display_name: liUser.name,
      profile_image_url: liUser.picture,
      access_token: tokenData.access_token,
      token_expires_at: expiresAt.toISOString(),
      // Store the URN in page_id field for easy access when posting
      page_id: authorUrn,
      scopes: tokenData.scope.split(' '),
      status: 'active',
      connected_at: new Date().toISOString(),
      created_by: userOrg.userId,
    }, {
      onConflict: 'organization_id,platform,platform_user_id'
    })

    if (saveError) {
      console.error('Error saving LinkedIn account:', saveError)
      return NextResponse.redirect(`${settingsUrl}?error=save_failed`)
    }

    return NextResponse.redirect(`${settingsUrl}?success=linkedin_connected`)
  } catch (error) {
    console.error('LinkedIn OAuth callback error:', error)
    return NextResponse.redirect(`${settingsUrl}?error=callback_failed`)
  }
}
