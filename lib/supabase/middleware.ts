import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  // All routes requiring authentication -- add new protected routes here
  // Webhook routes bypass auth entirely (they validate their own signatures)
  const webhookRoutes = ['/api/webhooks/whatsapp', '/api/webhooks/telegram']
  const isWebhookRoute = webhookRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )
  if (isWebhookRoute) {
    return response
  }

  const protectedRoutes = ['/dashboard', '/crm', '/email', '/content-generator', '/accommodation']
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Auth routes (login, signup) - redirect to dashboard if already authenticated
  const authRoutes = ['/login', '/signup']
  const isAuthRoute = authRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // If user is not authenticated and trying to access protected route
  if (isProtectedRoute && (!user || error)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If user is authenticated and trying to access auth routes (login/signup)
  if (isAuthRoute && user && !error) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Resolve organization context for authenticated users on protected routes
  if (user && !error && isProtectedRoute) {
    const { data: userRecord } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userRecord?.organization_id) {
      // Set org context as request headers for Server Components and API routes
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-organization-id', userRecord.organization_id)

      response = NextResponse.next({
        request: { headers: requestHeaders },
      })

      // Re-apply any cookies that were set during session refresh
      for (const cookie of request.cookies.getAll()) {
        response.cookies.set(cookie)
      }
    }
  }

  return response
}
