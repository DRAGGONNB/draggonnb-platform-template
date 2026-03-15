import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { getEmbeddedSignupUrl } from '@/lib/meta/embedded-signup'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const { data: userOrg, error } = await getUserOrg()
    if (error || !userOrg) {
      return NextResponse.redirect(new URL('/login', appUrl))
    }

    const state = crypto.randomUUID()

    const cookieStore = await cookies()
    cookieStore.set('meta_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })

    const authUrl = getEmbeddedSignupUrl(state)
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Meta Embedded Signup init error:', error)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(
      new URL('/onboarding/meta?error=oauth_init_failed', appUrl)
    )
  }
}
