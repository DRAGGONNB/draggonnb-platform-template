import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { verifyApiKey } from '@/lib/security/api-key-auth'
import { verifyMembership } from '@/lib/auth/membership-proof'

interface TenantContext {
  organizationId: string
  subdomain: string
  tier: string
  enabledModules: string[]
  linkedTrophyOrgId: string | null
}

// In-memory cache for tenant lookups (avoids DB query on every request)
const tenantCache = new Map<string, { data: TenantContext; expires: number }>()
const CACHE_TTL = 60_000 // 60 seconds

// In-memory cache for membership proofs (SSO-06: tenant_membership_proof)
// Key: `membership:${userId}:${orgId}` => boolean, expires per CACHE_TTL
const membershipCache = new Map<string, { valid: boolean; expires: number }>()

// Module-to-route mapping for access gating
const MODULE_ROUTE_MAP: Record<string, string> = {
  '/crm': 'crm',
  '/api/crm': 'crm',
  '/email': 'email',
  '/api/email': 'email',
  '/social': 'social',
  '/api/social': 'social',
  '/content-generator': 'content_studio',
  '/api/content': 'content_studio',
  '/accommodation': 'accommodation',
  '/api/accommodation': 'accommodation',
  '/autopilot': 'ai_agents',
  '/api/autopilot': 'ai_agents',
  '/analytics': 'analytics',
  '/api/analytics': 'analytics',
  '/restaurant': 'restaurant',
  '/api/restaurant': 'restaurant',
  '/events': 'events',
  '/api/events': 'events',
  '/security': 'security_ops',
  '/api/security': 'security_ops',
  '/elijah': 'security_ops',
  '/api/elijah': 'security_ops',
}

// Hostnames that are NOT subdomains (the platform itself)
const PLATFORM_HOSTS = ['www', 'draggonnb', 'draggonnb-mvp', 'localhost']

async function resolveTenant(subdomain: string): Promise<TenantContext | null> {
  const cached = tenantCache.get(subdomain)
  if (cached && cached.expires > Date.now()) return cached.data

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: org } = await adminClient
    .from('organizations')
    .select('id, subscription_tier, subdomain, linked_trophy_org_id')
    .eq('subdomain', subdomain)
    .is('archived_at', null) // Phase 10 (10-07): soft-archived orgs must not resolve
    .single()

  if (!org) return null

  const { data: modules } = await adminClient
    .from('tenant_modules')
    .select('module_id')
    .eq('organization_id', org.id)
    .eq('is_enabled', true)

  const context: TenantContext = {
    organizationId: org.id,
    subdomain: org.subdomain,
    tier: org.subscription_tier,
    enabledModules: (modules || []).map((m: { module_id: string }) => m.module_id),
    linkedTrophyOrgId: (org as unknown as { linked_trophy_org_id: string | null }).linked_trophy_org_id ?? null,
  }

  tenantCache.set(subdomain, { data: context, expires: Date.now() + CACHE_TTL })
  return context
}

function isSubdomainHost(hostname: string): string | null {
  // Skip if subdomain routing is disabled
  if (process.env.ENABLE_SUBDOMAIN_ROUTING !== 'true') return null

  const subdomain = hostname.split('.')[0]
  if (!subdomain) return null
  if (PLATFORM_HOSTS.includes(subdomain)) return null
  if (hostname.startsWith('localhost')) return null

  return subdomain
}

export async function updateSession(request: NextRequest) {
  // --- M2M API key authentication for /api/external/* routes ---
  if (request.nextUrl.pathname.startsWith('/api/external/')) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const result = await verifyApiKey(token)
      if (!result) {
        return NextResponse.json(
          { error: 'Invalid or expired API key' },
          { status: 401 }
        )
      }
      // Inject organization context and pass through (skip session logic)
      const headers = new Headers(request.headers)
      headers.set('x-organization-id', result.organization_id)
      headers.set('x-api-key-scopes', result.scopes.join(','))
      return NextResponse.next({ request: { headers } })
    }
    // No Bearer token on /api/external/ -> reject
    return NextResponse.json(
      { error: 'Missing Authorization header' },
      { status: 401 }
    )
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // --- Subdomain detection and tenant resolution ---
  const hostname = request.headers.get('host') || ''
  const subdomain = isSubdomainHost(hostname)

  if (subdomain) {
    const tenant = await resolveTenant(subdomain)
    if (!tenant) {
      // Unknown subdomain -> redirect to main site
      return NextResponse.redirect(new URL('https://draggonnb.co.za'))
    }

    // Inject tenant context into headers (available in API routes via getTenantContext())
    const headers = new Headers(request.headers)
    headers.set('x-tenant-id', tenant.organizationId)
    headers.set('x-tenant-subdomain', tenant.subdomain)
    headers.set('x-tenant-tier', tenant.tier)
    headers.set('x-tenant-modules', tenant.enabledModules.join(','))
    // LATENT-02: inject linked_trophy_org_id so sidebar can render Trophy link
    // without a separate DB query per request. Empty string = no link.
    headers.set('x-linked-trophy-org-id', tenant.linkedTrophyOrgId ?? '')

    response = NextResponse.next({
      request: { headers },
    })
  }

  // --- Supabase session management (existing logic) ---
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        // SSO-07 / CATASTROPHIC #1: per-host cookies only.
        // NEVER pass Domain=.draggonnb.co.za — it would leak the session cookie
        // across tenant subdomains and trophyos.co.za. Each host owns its own cookie.
        // If you need to add cookie options here, add a runtime assertion that options.domain is undefined.
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  // --- SSO-06: tenant_membership_proof — runs BEFORE any downstream getUserOrg() ---
  // 403 on missing membership; never auto-create silently. Bypass for SSO/auth routes themselves.
  if (user && subdomain) {
    const tenantId = request.headers.get('x-tenant-id') || ''
    if (tenantId) {
      const membershipCacheKey = `membership:${user.id}:${tenantId}`
      const cached = membershipCache.get(membershipCacheKey)
      let membershipValid: boolean
      if (cached && cached.expires > Date.now()) {
        membershipValid = cached.valid
      } else {
        membershipValid = await verifyMembership(user.id, tenantId)
        membershipCache.set(membershipCacheKey, { valid: membershipValid, expires: Date.now() + CACHE_TTL })
      }
      if (!membershipValid) {
        const path = request.nextUrl.pathname
        const isProtectedPath = path.startsWith('/dashboard') || (path.startsWith('/api/') && !path.startsWith('/api/sso/'))
        if (isProtectedPath) {
          return NextResponse.json(
            { error: 'No active membership in this tenant', code: 'TENANT_MEMBERSHIP_REQUIRED' },
            { status: 403 }
          )
        }
      }
    }
  }

  // --- Public route bypass (webhooks, guest portal, iCal feeds) ---
  const publicApiRoutes = [
    '/api/webhooks/whatsapp',
    '/api/webhooks/telegram',
    '/api/webhooks/payfast',
    '/api/guest-portal',
    '/api/accommodation/ical',
    '/api/meta/callback',
    '/api/meta/waba-shared',
  ]
  const isPublicApiRoute = publicApiRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )
  if (isPublicApiRoute) {
    return response
  }

  // --- Module access gating (subdomain requests only) ---
  if (subdomain && user) {
    const tenantModules = request.headers.get('x-tenant-modules')?.split(',').filter(Boolean) || []
    const pathname = request.nextUrl.pathname

    for (const [routePrefix, moduleId] of Object.entries(MODULE_ROUTE_MAP)) {
      if (pathname.startsWith(routePrefix) && !tenantModules.includes(moduleId)) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Module not enabled', module: moduleId },
            { status: 403 }
          )
        }
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  // --- Protected routes ---
  const protectedRoutes = ['/dashboard', '/crm', '/email', '/content-generator', '/accommodation', '/social', '/autopilot', '/analytics', '/billing', '/admin', '/onboarding', '/settings', '/elijah']
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

  // --- SSO-04 / SSO-08: CSP headers for /sso/consume consumer page ---
  // frame-ancestors 'none' blocks iframe embedding (fragment-token extraction attack).
  // connect-src restricts XHR/fetch to known origins (prevents token exfiltration).
  if (request.nextUrl.pathname === '/sso/consume') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; connect-src 'self' https://psqfgzbjbgqrmjskdavs.supabase.co wss://psqfgzbjbgqrmjskdavs.supabase.co; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; form-action 'self'"
    )
    response.headers.set('Referrer-Policy', 'no-referrer')
  }

  return response
}
