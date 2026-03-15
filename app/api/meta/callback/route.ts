import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeEmbeddedSignupCode, getWABADetails } from '@/lib/meta/embedded-signup'
import type { TenantMetaConfig } from '@/lib/meta/config'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const onboardingUrl = `${baseUrl}/onboarding/meta`

  if (errorParam) {
    console.error('Meta OAuth error:', errorParam, searchParams.get('error_description'))
    return NextResponse.redirect(`${onboardingUrl}?error=meta_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${onboardingUrl}?error=missing_params`)
  }

  try {
    const cookieStore = await cookies()
    const storedState = cookieStore.get('meta_oauth_state')?.value
    cookieStore.delete('meta_oauth_state')

    if (state !== storedState) {
      console.error('State mismatch:', { received: state, stored: storedState })
      return NextResponse.redirect(`${onboardingUrl}?error=invalid_state`)
    }

    const { data: userOrg, error: authError } = await getUserOrg()
    if (authError || !userOrg) {
      return NextResponse.redirect(`${baseUrl}/login`)
    }

    const tokenData = await exchangeEmbeddedSignupCode(code)
    const wabaDetails = await getWABADetails(tokenData.access_token)

    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in)

    const metaConfig: TenantMetaConfig = {
      waba_id: wabaDetails.waba_id,
      phone_number_id: wabaDetails.phone_number_id,
      access_token: tokenData.access_token,
      token_expires_at: expiresAt.toISOString(),
      onboarding_model: 'A',
      display_phone_number: wabaDetails.display_phone_number,
      verified_name: wabaDetails.verified_name,
    }

    const supabase = createAdminClient()

    const { data: existing } = await supabase
      .from('tenant_modules')
      .select('id, config')
      .eq('organization_id', userOrg.organizationId)
      .in('module_id', ['whatsapp', 'social'])
      .limit(1)
      .single()

    if (existing) {
      const mergedConfig = { ...(existing.config as Record<string, unknown> || {}), meta: metaConfig }
      await supabase
        .from('tenant_modules')
        .update({ config: mergedConfig })
        .eq('id', existing.id)
    } else {
      await supabase.from('tenant_modules').insert({
        organization_id: userOrg.organizationId,
        module_id: 'whatsapp',
        is_enabled: true,
        config: { meta: metaConfig },
      })
    }

    return NextResponse.redirect(`${onboardingUrl}?step=verify&status=success`)
  } catch (error) {
    console.error('Meta OAuth callback error:', error)
    return NextResponse.redirect(`${onboardingUrl}?error=callback_failed`)
  }
}
