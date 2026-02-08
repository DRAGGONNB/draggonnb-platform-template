# Phase 1: Security & Auth Hardening - Research

**Researched:** 2026-02-02
**Domain:** Supabase Row Level Security (RLS), Next.js 14 App Router Authentication, Multi-Tenant Security
**Confidence:** HIGH

## Summary

Phase 1 focuses on hardening security in an existing Next.js 14 + Supabase brownfield application (~60% complete). The project currently has authentication flows, middleware, and API routes in place, but critical security gaps exist: RLS is not enabled, signup doesn't link users to organizations, middleware only protects `/dashboard` (not `/crm`, `/email`, etc.), and webhook handlers lack admin clients to bypass RLS.

The standard approach for securing a multi-tenant Supabase application involves three layers: (1) **RLS policies** on all tables to enforce organization-level data isolation, (2) **Next.js middleware** using `@supabase/ssr` to protect routes and refresh tokens, and (3) **Admin clients** using service role keys for webhook handlers that need to bypass RLS. Security also requires HMAC-signed tokens for email tracking, URL validation to prevent open redirects, and environment variable validation at build time.

The research confirms that the existing codebase follows Supabase's recommended patterns (separate client/server Supabase clients, middleware proxy pattern), but implementation is incomplete. The signup flow (lines 90-143 in `app/signup/page.tsx`) already creates organizations and users correctly, but will fail once RLS is enabled because it uses the anon key. The PayFast webhook handler (lines 105-152 in `app/api/webhooks/payfast/route.ts`) also uses the server client, which will fail under RLS.

**Primary recommendation:** Enable RLS on all tables, create organization-scoped policies using `auth.uid()`, update middleware to protect all dashboard routes, create an admin Supabase client for webhooks, and implement HMAC signing for email tracking tokens.

## Standard Stack

The established libraries/tools for securing a Next.js 14 + Supabase multi-tenant application:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/ssr | 0.5.0+ | Server-side Supabase client with cookie handling | Official Supabase package for Next.js App Router - handles token refresh, cookie management |
| @supabase/supabase-js | 2.45.0+ | Supabase client library | Core SDK for database, auth, RLS interaction |
| next | 14.2.0+ | Next.js framework (App Router) | Provides middleware, server components, route handlers |
| crypto (Node.js built-in) | Node.js stdlib | HMAC signing, signature validation | Built into Node.js, no dependencies, cryptographically secure |
| zod | 3.22.4+ | Schema validation for environment variables | Type-safe runtime validation, prevents silent failures |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @t3-oss/env-nextjs | 0.11.0+ | Environment variable validation framework | When you want build-time env validation with client/server schema separation |
| jose | 5.9.0+ | JWT verification and manipulation | If you need to verify/decode JWTs manually (beyond `auth.getClaims()`) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/ssr | NextAuth.js | NextAuth provides more auth providers but requires session management; Supabase Auth already chosen for this project |
| crypto (built-in) | jsonwebtoken | jsonwebtoken is popular but adds dependency; crypto.createHmac is sufficient for HMAC signing |
| zod | joi, yup | zod has better TypeScript integration, smaller bundle size |

**Installation:**
```bash
# Core dependencies (already installed in project)
npm install @supabase/ssr@0.5.0 @supabase/supabase-js@2.45.0 next@14.2.0

# Schema validation (already installed)
npm install zod@3.22.4

# Optional: T3 Env for build-time validation
npm install @t3-oss/env-nextjs@0.11.0
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── supabase/
│   ├── client.ts              # Browser client (anon key)
│   ├── server.ts              # Server client (anon key + cookies)
│   ├── admin.ts               # Admin client (service role key) - CREATE THIS
│   └── middleware.ts          # Auth token refresh proxy
app/
├── middleware.ts              # Route protection + token refresh
├── (dashboard)/               # Protected routes group
│   ├── dashboard/
│   ├── crm/
│   ├── email/
│   └── content-generator/
└── api/
    ├── webhooks/              # Use admin client here
    └── [other-routes]/        # Use server client
```

### Pattern 1: Multi-Tenant RLS Policies

**What:** Row Level Security policies that enforce organization-level data isolation using `auth.uid()` and a join to the `users` table.

**When to use:** On every table that contains organization-scoped data (contacts, deals, campaigns, etc.)

**Example:**
```sql
-- Enable RLS on table
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see contacts in their organization
CREATE POLICY "Users can view contacts in their organization"
ON contacts
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM users
    WHERE id = auth.uid()
  )
);

-- Policy: Users can insert contacts into their organization
CREATE POLICY "Users can insert contacts into their organization"
ON contacts
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM users
    WHERE id = auth.uid()
  )
);

-- Policy: Users can update contacts in their organization
CREATE POLICY "Users can update contacts in their organization"
ON contacts
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM users
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM users
    WHERE id = auth.uid()
  )
);

-- Policy: Users can delete contacts in their organization
CREATE POLICY "Users can delete contacts in their organization"
ON contacts
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM users
    WHERE id = auth.uid()
  )
);
```

**Performance optimization:** Add index on organization_id for 100x improvement on large tables:
```sql
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id
ON contacts(organization_id);
```

**Source:** [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)

### Pattern 2: Admin Client for Webhook Handlers

**What:** A separate Supabase client using the service role key that bypasses RLS, used exclusively in server-side API routes that handle webhooks.

**When to use:** When external services (PayFast, Resend, Stripe) send webhooks that need to write data but have no user context.

**Example:**
```typescript
// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin credentials')
  }

  // Service role key bypasses RLS
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// app/api/webhooks/payfast/route.ts
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  // Validate webhook signature first...

  // Use admin client to bypass RLS
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('organizations')
    .update({ subscription_status: 'active' })
    .eq('id', organizationId)

  // ...
}
```

**Security note:** Never expose service role key to client, never commit to git, never pass in URLs.

**Source:** [Supabase Service Role Key Documentation](https://supabase.com/docs/guides/api/api-keys), [GitHub Discussion #1284](https://github.com/orgs/supabase/discussions/1284)

### Pattern 3: Next.js Middleware Route Protection

**What:** Middleware that uses `@supabase/ssr` to refresh auth tokens, check user authentication, and redirect unauthenticated users away from protected routes.

**When to use:** Required for all Next.js + Supabase applications to handle token refresh and route protection.

**Example:**
```typescript
// lib/supabase/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // CRITICAL: Use getClaims() not getSession() for JWT verification
  const { data: { user }, error } = await supabase.auth.getUser()

  // Protected routes requiring authentication
  const protectedRoutes = ['/dashboard', '/crm', '/email', '/content-generator']
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // If unauthenticated and accessing protected route, redirect to login
  if (isProtectedRoute && (!user || error)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

// middleware.ts (root)
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Security note:** Do NOT rely solely on middleware for authorization - always verify auth at data access points (server components, API routes).

**Source:** [Supabase Next.js Auth Documentation](https://supabase.com/docs/guides/auth/server-side/nextjs), [Next.js Authentication Guide](https://nextjs.org/learn/dashboard-app/adding-authentication)

### Pattern 4: HMAC-Signed Email Tracking Tokens

**What:** Cryptographically signed tokens in URL parameters (email unsubscribe, click tracking) that cannot be forged or tampered with.

**When to use:** Any URL parameter that grants access to a privileged operation without authentication (unsubscribe links, password reset tokens, magic links).

**Example:**
```typescript
import { createHmac, timingSafeEqual } from 'crypto'

// Generate signed token for email unsubscribe
export function generateUnsubscribeToken(
  emailSendId: string,
  contactEmail: string
): string {
  const secret = process.env.EMAIL_TRACKING_SECRET
  if (!secret) throw new Error('EMAIL_TRACKING_SECRET not set')

  const timestamp = Date.now()
  const payload = `${emailSendId}:${contactEmail}:${timestamp}`

  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return Buffer.from(`${payload}:${signature}`).toString('base64url')
}

// Verify signed token
export function verifyUnsubscribeToken(token: string): {
  valid: boolean
  emailSendId?: string
  contactEmail?: string
  error?: string
} {
  try {
    const secret = process.env.EMAIL_TRACKING_SECRET
    if (!secret) throw new Error('EMAIL_TRACKING_SECRET not set')

    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const [emailSendId, contactEmail, timestamp, receivedSignature] = decoded.split(':')

    // Replay protection: reject tokens older than 30 days
    const tokenAge = Date.now() - parseInt(timestamp)
    if (tokenAge > 30 * 24 * 60 * 60 * 1000) {
      return { valid: false, error: 'Token expired' }
    }

    // Verify signature
    const payload = `${emailSendId}:${contactEmail}:${timestamp}`
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    // Use timing-safe comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')
    const receivedBuffer = Buffer.from(receivedSignature, 'hex')

    if (expectedBuffer.length !== receivedBuffer.length) {
      return { valid: false, error: 'Invalid signature' }
    }

    const valid = timingSafeEqual(expectedBuffer, receivedBuffer)

    if (!valid) {
      return { valid: false, error: 'Invalid signature' }
    }

    return { valid: true, emailSendId, contactEmail }
  } catch (error) {
    return { valid: false, error: 'Invalid token format' }
  }
}

// Usage in unsubscribe route
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const verification = verifyUnsubscribeToken(token)

  if (!verification.valid) {
    return NextResponse.json({ error: verification.error }, { status: 401 })
  }

  // Process unsubscribe using admin client...
  const supabase = createAdminClient()
  await supabase
    .from('contacts')
    .update({ email_unsubscribed: true })
    .eq('email', verification.contactEmail)

  return NextResponse.json({ success: true })
}
```

**Security features:**
- SHA256 HMAC prevents forgery
- Timestamp prevents replay attacks (30-day expiration)
- Timing-safe comparison prevents timing attacks
- Base64url encoding is URL-safe

**Source:** [HMAC API Security Best Practices](https://www.authgear.com/post/hmac-api-security), [HMAC Authentication Guide](https://blog.gitguardian.com/hmac-secrets-explained-authentication/)

### Pattern 5: URL Validation for Click Tracking

**What:** Validation of redirect URLs to prevent open redirect attacks where malicious users craft URLs that redirect to phishing sites.

**When to use:** Any endpoint that accepts a URL parameter and performs a redirect (email click tracking, OAuth callbacks, post-login redirects).

**Example:**
```typescript
// lib/security/url-validator.ts
export function isValidRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url)

    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false
    }

    // Optional: Allowlist specific domains
    const allowedDomains = [
      'yourdomain.com',
      'www.yourdomain.com',
      'subdomain.yourdomain.com'
    ]

    // If allowlist is defined, enforce it
    if (allowedDomains.length > 0) {
      const isAllowed = allowedDomains.some(domain =>
        parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
      )

      if (!isAllowed) {
        return false
      }
    }

    return true
  } catch {
    // Invalid URL format
    return false
  }
}

// app/api/email/track/route.ts
import { isValidRedirectUrl } from '@/lib/security/url-validator'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const redirectUrl = searchParams.get('url')

  if (!redirectUrl) {
    return NextResponse.json({ error: 'Missing URL' }, { status: 400 })
  }

  const decodedUrl = decodeURIComponent(redirectUrl)

  // Validate before redirecting
  if (!isValidRedirectUrl(decodedUrl)) {
    return NextResponse.json(
      { error: 'Invalid redirect URL' },
      { status: 400 }
    )
  }

  // Track click in database...

  // Safe to redirect
  return NextResponse.redirect(decodedUrl, 302)
}
```

**Prevention strategies:**
- Protocol validation (reject `javascript:`, `data:`, `file:` schemes)
- Domain allowlist (preferred over blocklist)
- Relative URL validation (if only internal redirects needed)
- User notification page (show destination, require confirmation)

**Source:** [OWASP Unvalidated Redirects Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html), [Open Redirect Prevention Guide](https://www.stackhawk.com/blog/what-is-open-redirect/)

### Pattern 6: Environment Variable Validation at Build Time

**What:** Schema-based validation of environment variables at build time to catch missing or invalid configuration before deployment.

**When to use:** Always - prevents silent failures from typos, missing variables, or mismatched variable names.

**Example:**
```typescript
// lib/env.ts
import { z } from 'zod'

const serverEnvSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // PayFast
  PAYFAST_MERCHANT_ID: z.string().min(1),
  PAYFAST_MERCHANT_KEY: z.string().min(1),
  PAYFAST_PASSPHRASE: z.string().optional(),
  PAYFAST_MODE: z.enum(['sandbox', 'production']),

  // Email
  RESEND_API_KEY: z.string().min(1),
  EMAIL_TRACKING_SECRET: z.string().min(32),

  // Security
  SETUP_SECRET: z.string().min(20).optional(),
})

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

// Validate at module load time
export const serverEnv = serverEnvSchema.parse(process.env)

// Only include NEXT_PUBLIC_ vars for client
export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
})

// Type-safe access
export type ServerEnv = z.infer<typeof serverEnvSchema>
export type ClientEnv = z.infer<typeof clientEnvSchema>

// next.config.js
import './lib/env.js' // Fails build if env vars invalid

export default {
  // ... rest of config
}
```

**Best practices:**
- Import validation file in `next.config.js` for build-time checking
- Never expose sensitive vars as `NEXT_PUBLIC_*`
- Use `.min()` to enforce minimum lengths
- Use `.url()` to validate URL format
- Use `.enum()` for environment modes (sandbox, production)
- Add `.optional()` only for truly optional variables

**Source:** [Next.js Environment Variables Validation with Zod](https://blog.stackademic.com/next-js-14-environment-variables-validation-using-zod-6e1dd95c3406), [Type-Safe Next.js Environment Configuration](https://devkraken.com/blog/nextjs-typescript-environment-configuration-guide)

### Anti-Patterns to Avoid

- **Using `getSession()` for server-side auth:** Use `getUser()` or `getClaims()` instead - `getSession()` doesn't verify JWT signatures
- **RLS policies without explicit role (missing `TO` clause):** Always specify `TO authenticated` or `TO anon` - improves performance
- **Policies that rely on `user_metadata`:** User metadata is modifiable by users - use `app_metadata` or database tables for authorization data
- **Service role key in client code:** Never expose in browser, never commit to git, never pass in query params
- **Hardcoded default secrets in API routes:** Always require explicit environment variables - no fallbacks like `|| 'default-secret-2024'`
- **Bare `auth.uid()` without null check:** When unauthenticated, `auth.uid()` returns `null`, causing silent failures - use `auth.uid() IS NOT NULL AND auth.uid() = user_id`
- **No index on organization_id:** RLS policies with joins are slow without indexes - add `CREATE INDEX idx_table_organization_id ON table(organization_id)`
- **Middleware-only auth:** Never rely solely on middleware - always verify auth at data access points (CVE-2025-29927 vulnerability)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT verification | Custom JWT parser with `jsonwebtoken` | `supabase.auth.getUser()` or `supabase.auth.getClaims()` | Supabase handles token refresh, signature verification, expiry checks automatically |
| HMAC comparison | String comparison (`===`) | `crypto.timingSafeEqual()` | Prevents timing attacks where attackers measure comparison time to guess signatures |
| Environment validation | Manual checks with `if (!process.env.VAR)` | Zod schema with build-time validation | Catches typos, validates formats (URL, enum), provides TypeScript types |
| Password reset tokens | UUID in URL parameter | Supabase Auth password reset flow | Handles token generation, expiry, rate limiting, email delivery |
| Session management | Custom JWT storage in cookies | `@supabase/ssr` package | Handles cookie security (HttpOnly, Secure, SameSite), token refresh, SSR compatibility |
| Open redirect protection | Regex-based URL validation | URL parser + allowlist | Regex is fragile and bypassable - URL parser handles edge cases (unicode domains, port numbers, etc.) |

**Key insight:** Security primitives (JWT, HMAC, session management) have subtle edge cases that are easy to get wrong. Use battle-tested libraries from Supabase, Node.js crypto, and the Next.js ecosystem rather than custom implementations.

## Common Pitfalls

### Pitfall 1: Enabling RLS Without Creating Policies

**What goes wrong:** You enable RLS on a table but forget to create policies. All queries return zero rows, including for authenticated users. Your application appears broken.

**Why it happens:** RLS defaults to "deny all" when no policies exist. Developers enable RLS thinking it's just a switch, but policies are what define access rules.

**How to avoid:**
1. Always create at least one policy immediately after enabling RLS
2. Test with authenticated user - verify data is accessible
3. Create policies for all operations (SELECT, INSERT, UPDATE, DELETE)

**Warning signs:**
- Queries return empty arrays even though data exists in Supabase dashboard
- No errors logged, just silent empty results
- Supabase dashboard (with service role key) shows data but application doesn't

**Fix checklist:**
```sql
-- 1. Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- 2. Immediately create at least SELECT policy
CREATE POLICY "Users can view their org's contacts"
ON contacts FOR SELECT TO authenticated
USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- 3. Test with authenticated user before proceeding
```

**Source:** [Supabase RLS Troubleshooting](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)

### Pitfall 2: Signup Flow Fails After Enabling RLS

**What goes wrong:** User signup works in development but fails in production after enabling RLS. The `users.insert()` call in the signup flow returns an RLS policy violation error.

**Why it happens:** The signup flow uses the anon key Supabase client to insert into the `users` table. Once RLS is enabled, the anon role cannot insert because no policy allows it. The `auth.uid()` is not yet available during signup because the user session hasn't been established.

**How to avoid:**
1. Create an INSERT policy for the `users` table that allows `id = auth.uid()`
2. Ensure the policy uses `WITH CHECK` not just `USING`
3. Remember that `auth.uid()` becomes available immediately after `signUp()` completes

**Warning signs:**
- Signup works without RLS, fails with RLS
- Error message: "new row violates row-level security policy"
- Error occurs on `supabase.from('users').insert()`

**Fix:**
```sql
-- Policy: Users can insert their own record during signup
CREATE POLICY "Users can insert their own record"
ON users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Also need organization policy if signup creates org first
CREATE POLICY "Anyone can insert organization during signup"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (true); -- Or more restrictive: created_by = auth.uid()
```

**Important:** The signup flow must be ordered correctly:
1. Call `supabase.auth.signUp()` - creates auth.users record
2. Insert into `organizations` table - now `auth.uid()` is available
3. Insert into `users` table with `id = auth.uid()`

**Source:** Current codebase analysis (`app/signup/page.tsx` lines 90-143), [Supabase RLS Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)

### Pitfall 3: Webhook Handlers Fail After Enabling RLS

**What goes wrong:** PayFast payment webhooks stop working after enabling RLS. The webhook handler cannot update the `organizations` table and returns 500 errors.

**Why it happens:** Webhook handlers use the server Supabase client (anon key + cookies), which enforces RLS. External webhooks (PayFast, Stripe, Resend) have no user context, so `auth.uid()` returns null and RLS policies block the write.

**How to avoid:**
1. Create a separate admin Supabase client using service role key
2. Use admin client exclusively in webhook routes
3. Never use admin client in routes that handle user-initiated requests

**Warning signs:**
- Webhooks worked before RLS, fail after
- Error message: "new row violates row-level security policy" in webhook logs
- Webhook handler uses `createClient()` from `@/lib/supabase/server`

**Fix:**
```typescript
// lib/supabase/admin.ts - CREATE THIS FILE
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin credentials')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// app/api/webhooks/payfast/route.ts
import { createAdminClient } from '@/lib/supabase/admin' // CHANGE THIS

export async function POST(request: NextRequest) {
  // ... validate webhook signature ...

  const supabase = createAdminClient() // Use admin client

  await supabase
    .from('organizations')
    .update({ subscription_status: 'active' })
    .eq('id', organizationId)

  // ... rest of handler ...
}
```

**Critical security note:** Only use admin client in webhook routes that validate signatures. Never use in user-initiated API routes.

**Source:** [Supabase Service Role Key Discussion](https://github.com/orgs/supabase/discussions/1284), current codebase analysis

### Pitfall 4: Middleware Protects `/dashboard` But Not `/crm`, `/email`

**What goes wrong:** Users can access `/crm` and `/email` routes without logging in, even though these are sensitive pages. Only `/dashboard` redirects to login.

**Why it happens:** The middleware has a hardcoded list of protected routes that only includes `/dashboard`. The developer added new routes (`/crm`, `/email`, `/content-generator`) but forgot to update the middleware.

**How to avoid:**
1. Use route groups in Next.js: Put all protected routes under `app/(dashboard)/`
2. Update middleware to protect all routes under route group
3. Document protected routes list in a comment
4. Add integration test that verifies unauthenticated access is blocked

**Warning signs:**
- New protected pages don't redirect to login
- Middleware only checks specific route names
- Routes are organized but middleware doesn't follow organization

**Fix:**
```typescript
// lib/supabase/middleware.ts
export async function updateSession(request: NextRequest) {
  // ... supabase client setup ...

  const { data: { user }, error } = await supabase.auth.getUser()

  // Protected routes requiring authentication
  const protectedRoutes = [
    '/dashboard',
    '/crm',          // ADD THESE
    '/email',        // ADD THESE
    '/content-generator', // ADD THESE
  ]

  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtectedRoute && (!user || error)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}
```

**Better approach:** Use Next.js layout-based protection in `app/(dashboard)/layout.tsx` to verify auth for entire route group.

**Source:** Current codebase analysis (`lib/supabase/middleware.ts` lines 59-76)

### Pitfall 5: Setup API Has Hardcoded Default Secret

**What goes wrong:** The setup API endpoint (`/api/setup`) has a hardcoded fallback secret `'draggonnb-setup-2024'`. Anyone who reads the source code can call this endpoint and check database configuration.

**Why it happens:** Developer adds fallback value to make local development easier, forgetting that this code will be deployed to production.

**How to avoid:**
1. Never use `||` fallback operators for sensitive environment variables
2. Validate environment variables at build time with Zod
3. Fail fast if required variables are missing
4. Document required variables in `.env.example`

**Warning signs:**
- Code contains `|| 'default-value'` for secrets
- No build-time environment validation
- Setup endpoints with weak or predictable secrets

**Fix:**
```typescript
// lib/env.ts
import { z } from 'zod'

const serverEnvSchema = z.object({
  // ... other vars ...
  SETUP_SECRET: z.string().min(32).optional(), // Require 32+ chars if set
})

export const serverEnv = serverEnvSchema.parse(process.env)

// app/api/setup/route.ts
import { serverEnv } from '@/lib/env'

export async function POST(request: NextRequest) {
  const { secret } = await request.json()

  // REMOVE: const SETUP_SECRET = process.env.SETUP_SECRET || 'draggonnb-setup-2024'

  // REPLACE WITH:
  if (!serverEnv.SETUP_SECRET) {
    return NextResponse.json(
      { error: 'Setup endpoint disabled - SETUP_SECRET not configured' },
      { status: 503 }
    )
  }

  if (secret !== serverEnv.SETUP_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  // ... rest of setup logic ...
}
```

**Source:** Current codebase analysis (`app/api/setup/route.ts` line 8)

### Pitfall 6: Email Click Tracking Allows Open Redirects

**What goes wrong:** Email click tracking endpoint accepts any URL in the `?url=` parameter and redirects without validation. Attacker crafts email with malicious link: `https://yourdomain.com/api/email/track?type=click&url=https://phishing-site.com`

**Why it happens:** Developer focuses on tracking functionality, forgets that redirect is a security-sensitive operation. URL is decoded and redirected directly without checking protocol or domain.

**How to avoid:**
1. Validate redirect URL protocol (only allow http/https)
2. Use domain allowlist for external redirects
3. Show confirmation page for external redirects
4. Log suspicious redirect attempts

**Warning signs:**
- Redirect endpoint accepts `url` parameter without validation
- No check for `javascript:`, `data:`, or other dangerous protocols
- No domain allowlist enforcement

**Fix:**
```typescript
// app/api/email/track/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const redirectUrl = searchParams.get('url')

  if (!redirectUrl) {
    return NextResponse.json({ error: 'Missing URL' }, { status: 400 })
  }

  const decodedUrl = decodeURIComponent(redirectUrl)

  // ADD VALIDATION
  try {
    const parsed = new URL(decodedUrl)

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      console.warn(`Blocked dangerous protocol: ${parsed.protocol}`)
      return NextResponse.json(
        { error: 'Invalid redirect URL' },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid URL format' },
      { status: 400 }
    )
  }

  // Track click...

  return NextResponse.redirect(decodedUrl, 302)
}
```

**Source:** Current codebase analysis (`app/api/email/track/route.ts` lines 80-123), [OWASP Open Redirect Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)

### Pitfall 7: Missing Indexes on RLS Policy Columns

**What goes wrong:** After enabling RLS, queries become extremely slow (10-100x slower). Pagination times out, dashboard takes 30+ seconds to load.

**Why it happens:** RLS policies with joins (e.g., checking `organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())`) perform table scans without indexes. Postgres evaluates the policy on every row.

**How to avoid:**
1. Add index on every column used in RLS policies
2. Use `EXPLAIN ANALYZE` to check query plans
3. Monitor query performance after enabling RLS
4. Add indexes before enabling RLS on large tables

**Warning signs:**
- Queries slow down significantly after enabling RLS
- `EXPLAIN ANALYZE` shows sequential scans on large tables
- Database CPU usage spikes after RLS enabled

**Fix:**
```sql
-- Add index on organization_id for every table with RLS policies
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id
ON contacts(organization_id);

CREATE INDEX IF NOT EXISTS idx_deals_organization_id
ON deals(organization_id);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_organization_id
ON email_campaigns(organization_id);

-- Also index the users.id column used in policies
CREATE INDEX IF NOT EXISTS idx_users_id
ON users(id);

-- Verify index usage with EXPLAIN
EXPLAIN ANALYZE
SELECT * FROM contacts WHERE organization_id IN (
  SELECT organization_id FROM users WHERE id = 'user-uuid'
);
-- Should show "Index Scan" not "Seq Scan"
```

**Performance improvement:** 100x+ speedup on tables with 10,000+ rows (from 1000ms to 10ms).

**Source:** [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)

### Pitfall 8: Environment Variable Name Mismatch Between Code and `.env.example`

**What goes wrong:** `.env.example` documents `PAYFAST_PASSPHRASE` but the code reads `PAYFAST_PASSPHRASE_SECRET`. Developer copies `.env.example` to `.env.local`, but the code silently fails because the variable name doesn't match.

**Why it happens:** Variable names evolve during development but documentation isn't updated. No validation catches the mismatch until runtime.

**How to avoid:**
1. Use Zod schema validation that matches `.env.example` exactly
2. Validate environment variables at build time
3. Use TypeScript to import validated environment object
4. Never read `process.env` directly - always use validated env object

**Warning signs:**
- Code reads `process.env.VAR_NAME` directly without validation
- `.env.example` has different variable names than code
- Silent failures in production from undefined variables

**Fix:**
```typescript
// lib/env.ts
import { z } from 'zod'

// Schema should match .env.example EXACTLY
const serverEnvSchema = z.object({
  PAYFAST_PASSPHRASE: z.string().optional(), // Match .env.example
  // NOT: PAYFAST_PASSPHRASE_SECRET
})

export const serverEnv = serverEnvSchema.parse(process.env)

// lib/payments/payfast.ts
import { serverEnv } from '@/lib/env'

export function validatePayFastSignature(data: Record<string, string>) {
  const passphrase = serverEnv.PAYFAST_PASSPHRASE // Type-safe access
  // NOT: process.env.PAYFAST_PASSPHRASE

  // ... rest of function ...
}
```

**Audit process:**
1. Extract all `process.env.*` references from codebase
2. Compare against `.env.example`
3. Add all variables to Zod schema
4. Replace direct `process.env` access with validated env object

**Source:** Current codebase analysis (`.env.example` vs actual usage in code)

## Code Examples

Verified patterns from official sources:

### Multi-Tenant RLS Policy Template

Complete RLS setup for a typical multi-tenant table:

```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security

-- 1. Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- 2. Add index for performance (100x improvement)
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id
ON contacts(organization_id);

-- 3. SELECT policy - users can view their org's data
CREATE POLICY "Users can view contacts in their organization"
ON contacts
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM users
    WHERE id = auth.uid()
  )
);

-- 4. INSERT policy - users can create in their org
CREATE POLICY "Users can insert contacts into their organization"
ON contacts
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM users
    WHERE id = auth.uid()
  )
);

-- 5. UPDATE policy - users can modify their org's data
CREATE POLICY "Users can update contacts in their organization"
ON contacts
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM users
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM users
    WHERE id = auth.uid()
  )
);

-- 6. DELETE policy - users can remove their org's data
CREATE POLICY "Users can delete contacts in their organization"
ON contacts
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM users
    WHERE id = auth.uid()
  )
);

-- Verify policies are applied
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'contacts';
```

### Complete Middleware Implementation

Full middleware with token refresh and route protection:

```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs

// lib/supabase/middleware.ts
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

  // CRITICAL: Use getUser() not getSession() for JWT verification
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/crm', '/email', '/content-generator']
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Auth routes (login, signup) - redirect to dashboard if already authenticated
  const authRoutes = ['/login', '/signup']
  const isAuthRoute = authRoutes.some((route) =>
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

  return response
}

// middleware.ts (root)
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/webhooks (webhook endpoints - no auth needed)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Admin Supabase Client for Webhooks

Create admin client that bypasses RLS:

```typescript
// Source: https://github.com/orgs/supabase/discussions/1284

// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client using service role key
 * BYPASSES ROW LEVEL SECURITY - use only in webhook handlers
 *
 * Use cases:
 * - PayFast payment webhooks
 * - Resend email webhooks
 * - N8N automation webhooks
 *
 * Security: NEVER use in user-initiated API routes
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase admin credentials. Ensure NEXT_PUBLIC_SUPABASE_URL ' +
      'and SUPABASE_SERVICE_ROLE_KEY are set in environment variables.'
    )
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Usage in webhook handler
// app/api/webhooks/payfast/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validatePayFastSignature } from '@/lib/payments/payfast'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const itnData: Record<string, string> = {}
  formData.forEach((value, key) => {
    itnData[key] = value.toString()
  })

  // ALWAYS validate webhook signature first
  const isValid = validatePayFastSignature(
    itnData,
    process.env.PAYFAST_PASSPHRASE
  )

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Safe to use admin client - webhook is authenticated
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('organizations')
    .update({ subscription_status: 'active' })
    .eq('id', itnData.custom_str1) // organization_id from webhook

  if (error) {
    console.error('Database update failed:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

### Environment Variable Validation

Build-time validation with Zod:

```typescript
// Source: https://blog.stackademic.com/next-js-14-environment-variables-validation-using-zod-6e1dd95c3406

// lib/env.ts
import { z } from 'zod'

// Server-side environment variables (includes secrets)
const serverEnvSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // PayFast
  PAYFAST_MERCHANT_ID: z.string().min(1),
  PAYFAST_MERCHANT_KEY: z.string().min(1),
  PAYFAST_PASSPHRASE: z.string().optional(),
  PAYFAST_MODE: z.enum(['sandbox', 'production']),
  PAYFAST_RETURN_URL: z.string().url(),
  PAYFAST_CANCEL_URL: z.string().url(),
  PAYFAST_NOTIFY_URL: z.string().url(),

  // Email
  RESEND_API_KEY: z.string().regex(/^re_/), // Resend keys start with re_
  RESEND_WEBHOOK_SECRET: z.string().min(1),
  EMAIL_TRACKING_SECRET: z.string().min(32), // Require strong secret

  // Security
  SETUP_SECRET: z.string().min(20).optional(), // Require 20+ chars if set
})

// Client-side environment variables (only NEXT_PUBLIC_*)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

// Custom error formatting
function formatErrors(errors: z.ZodIssue[]) {
  return errors
    .map((err) => `${err.path.join('.')}: ${err.message}`)
    .join('\n')
}

// Validate and export
let serverEnv: z.infer<typeof serverEnvSchema>
let clientEnv: z.infer<typeof clientEnvSchema>

try {
  serverEnv = serverEnvSchema.parse(process.env)
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid server environment variables:\n')
    console.error(formatErrors(error.issues))
    process.exit(1)
  }
  throw error
}

try {
  clientEnv = clientEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  })
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid client environment variables:\n')
    console.error(formatErrors(error.issues))
    process.exit(1)
  }
  throw error
}

export { serverEnv, clientEnv }

// Type exports
export type ServerEnv = z.infer<typeof serverEnvSchema>
export type ClientEnv = z.infer<typeof clientEnvSchema>

// next.config.js - Import to validate at build time
import './lib/env.js'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... rest of config
}

export default nextConfig
```

### HMAC-Signed URL Token Generation

Unsubscribe token generation and verification:

```typescript
// Source: https://www.authgear.com/post/hmac-api-security

// lib/security/email-tokens.ts
import { createHmac, timingSafeEqual } from 'crypto'

const TOKEN_EXPIRY_DAYS = 30

/**
 * Generate HMAC-signed unsubscribe token
 * Format: base64url(emailSendId:contactEmail:timestamp:signature)
 */
export function generateUnsubscribeToken(
  emailSendId: string,
  contactEmail: string
): string {
  const secret = process.env.EMAIL_TRACKING_SECRET
  if (!secret) {
    throw new Error('EMAIL_TRACKING_SECRET environment variable not set')
  }

  const timestamp = Date.now().toString()
  const payload = `${emailSendId}:${contactEmail}:${timestamp}`

  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  const token = `${payload}:${signature}`
  return Buffer.from(token).toString('base64url')
}

/**
 * Verify HMAC-signed unsubscribe token
 * Returns parsed data if valid, error if invalid/expired
 */
export function verifyUnsubscribeToken(token: string): {
  valid: boolean
  emailSendId?: string
  contactEmail?: string
  error?: string
} {
  try {
    const secret = process.env.EMAIL_TRACKING_SECRET
    if (!secret) {
      throw new Error('EMAIL_TRACKING_SECRET environment variable not set')
    }

    // Decode token
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const parts = decoded.split(':')

    if (parts.length !== 4) {
      return { valid: false, error: 'Invalid token format' }
    }

    const [emailSendId, contactEmail, timestamp, receivedSignature] = parts

    // Check expiry
    const tokenAge = Date.now() - parseInt(timestamp, 10)
    const maxAge = TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000

    if (tokenAge > maxAge) {
      return { valid: false, error: 'Token expired' }
    }

    if (tokenAge < 0) {
      return { valid: false, error: 'Token timestamp is in the future' }
    }

    // Verify signature
    const payload = `${emailSendId}:${contactEmail}:${timestamp}`
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    // Use timing-safe comparison
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')
    const receivedBuffer = Buffer.from(receivedSignature, 'hex')

    if (expectedBuffer.length !== receivedBuffer.length) {
      return { valid: false, error: 'Invalid signature' }
    }

    const isValid = timingSafeEqual(expectedBuffer, receivedBuffer)

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' }
    }

    return { valid: true, emailSendId, contactEmail }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid token',
    }
  }
}

// Usage in unsubscribe API route
// app/api/email/unsubscribe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyUnsubscribeToken } from '@/lib/security/email-tokens'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const verification = verifyUnsubscribeToken(token)

  if (!verification.valid) {
    return NextResponse.json(
      { error: verification.error || 'Invalid token' },
      { status: 401 }
    )
  }

  // Use admin client to update contact (no user context)
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('contacts')
    .update({ email_unsubscribed: true, unsubscribed_at: new Date().toISOString() })
    .eq('email', verification.contactEmail)

  if (error) {
    console.error('Unsubscribe failed:', error)
    return NextResponse.json({ error: 'Unsubscribe failed' }, { status: 500 })
  }

  // Return success page
  return new Response(
    `
    <!DOCTYPE html>
    <html>
      <head><title>Unsubscribed</title></head>
      <body>
        <h1>Successfully Unsubscribed</h1>
        <p>You have been removed from our mailing list.</p>
      </body>
    </html>
    `,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }
  )
}
```

### URL Validation for Click Tracking

Prevent open redirect attacks:

```typescript
// Source: https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html

// lib/security/url-validator.ts

/**
 * Validate redirect URL to prevent open redirect attacks
 *
 * Security checks:
 * 1. URL must be valid format
 * 2. Protocol must be http or https (no javascript:, data:, file:)
 * 3. Domain must be in allowlist (if provided)
 */
export function isValidRedirectUrl(
  url: string,
  allowedDomains?: string[]
): boolean {
  try {
    const parsed = new URL(url)

    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      console.warn(`Blocked dangerous protocol: ${parsed.protocol}`)
      return false
    }

    // If allowlist provided, enforce it
    if (allowedDomains && allowedDomains.length > 0) {
      const isAllowed = allowedDomains.some((domain) => {
        // Exact match or subdomain match
        return (
          parsed.hostname === domain ||
          parsed.hostname.endsWith(`.${domain}`)
        )
      })

      if (!isAllowed) {
        console.warn(`Blocked domain not in allowlist: ${parsed.hostname}`)
        return false
      }
    }

    return true
  } catch (error) {
    console.warn('Invalid URL format:', url)
    return false
  }
}

/**
 * Validate relative URL (for internal redirects only)
 */
export function isValidRelativeUrl(url: string): boolean {
  // Must start with / but not //
  if (!url.startsWith('/') || url.startsWith('//')) {
    return false
  }

  // Must not contain protocol
  if (url.includes(':')) {
    return false
  }

  return true
}

// Usage in click tracking API
// app/api/email/track/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { isValidRedirectUrl } from '@/lib/security/url-validator'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const emailSendId = searchParams.get('id')
  const redirectUrl = searchParams.get('url')

  if (type === 'click') {
    if (!redirectUrl) {
      return NextResponse.json({ error: 'Missing URL' }, { status: 400 })
    }

    const decodedUrl = decodeURIComponent(redirectUrl)

    // Validate before redirecting
    if (!isValidRedirectUrl(decodedUrl)) {
      console.warn(`Blocked redirect attempt to: ${decodedUrl}`)
      return NextResponse.json(
        { error: 'Invalid redirect URL' },
        { status: 400 }
      )
    }

    // Track click
    if (emailSendId) {
      const supabase = await createClient()
      await supabase
        .from('email_sends')
        .update({
          click_count: supabase.raw('click_count + 1'),
          clicked_at: new Date().toISOString(),
        })
        .eq('id', emailSendId)
    }

    // Safe to redirect
    return NextResponse.redirect(decodedUrl, 302)
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
```

## State of the Art

Recent changes in the Supabase + Next.js security landscape:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Use `getSession()` for server-side auth | Use `getUser()` or `getClaims()` | 2024 | `getSession()` doesn't verify JWT signatures - security vulnerability |
| Middleware-only auth protection | Middleware + data access layer verification | 2025 (CVE-2025-29927) | Middleware can be bypassed - must verify at every data access point |
| Manual cookie handling for auth | `@supabase/ssr` package | 2023 | SSR package handles token refresh, cookie management automatically |
| Create separate clients per route | Single client factory pattern | 2024 | Better performance, consistent configuration |
| RLS policies without explicit role | Always specify `TO authenticated` or `TO anon` | 2024 | Performance optimization - Postgres can skip policy evaluation for other roles |
| Use `user_metadata` for roles | Use `app_metadata` or database tables | 2024 | `user_metadata` is modifiable by users - security risk |

**Deprecated/outdated:**
- **`supabase.auth.session()`**: Use `supabase.auth.getUser()` instead - better error handling
- **`createClient()` in every component**: Use factory pattern in `lib/supabase/` - better caching
- **Environment variables without validation**: Use Zod schema - catches errors at build time

## Open Questions

Things that couldn't be fully resolved:

1. **Should PayFast passphrase be required in sandbox mode?**
   - What we know: Current code logs warning if missing in production mode (line 41 in `lib/payments/payfast.ts`)
   - What's unclear: PayFast docs don't clarify if passphrase is optional for sandbox
   - Recommendation: Make passphrase required in both modes, fail webhook validation if missing (more secure)

2. **Should middleware protect API routes under `/api/` (except webhooks)?**
   - What we know: Current middleware excludes all `/api/webhooks` routes
   - What's unclear: Should user-initiated API routes (e.g., `/api/crm/contacts`) be protected by middleware or rely on RLS only?
   - Recommendation: Rely on RLS for API routes - middleware redirect doesn't work for API calls (should return 401, not redirect). Add explicit auth check in API routes.

3. **Should email tracking tokens include organization_id for additional validation?**
   - What we know: Current email tracking uses `emailSendId` only (line 19 in `app/api/email/track/route.ts`)
   - What's unclear: Would including `organization_id` in tracking URL provide meaningful security benefit?
   - Recommendation: Not necessary - `emailSendId` is already UUID, adding org_id doesn't prevent guessing. Focus on HMAC signing for unsubscribe tokens instead.

## Sources

### Primary (HIGH confidence)
- [Supabase Row Level Security Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) - Official RLS guide
- [Supabase Next.js Auth Documentation](https://supabase.com/docs/guides/auth/server-side/nextjs) - Official Next.js integration
- [Supabase API Keys Documentation](https://supabase.com/docs/guides/api/api-keys) - Service role key usage
- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware) - Middleware patterns
- [Next.js Authentication Guide](https://nextjs.org/learn/dashboard-app/adding-authentication) - Official auth tutorial
- [Next.js Security Guide](https://nextjs.org/blog/security-nextjs-server-components-actions) - CVE-2025-29927 vulnerability details
- [OWASP Unvalidated Redirects Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html) - Open redirect prevention

### Secondary (MEDIUM confidence)
- [Supabase RLS Troubleshooting Guide](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) - Performance optimization
- [Supabase Service Role Key Discussion](https://github.com/orgs/supabase/discussions/1284) - Community best practices
- [Supabase Webhook Authentication Discussion](https://github.com/orgs/supabase/discussions/14115) - Webhook security patterns
- [Next.js Environment Variables Validation with Zod](https://blog.stackademic.com/next-js-14-environment-variables-validation-using-zod-6e1dd95c3406) - Build-time validation
- [Type-Safe Next.js Environment Configuration](https://devkraken.com/blog/nextjs-typescript-environment-configuration-guide) - TypeScript patterns
- [HMAC API Security Best Practices](https://www.authgear.com/post/hmac-api-security) - HMAC implementation
- [HMAC Secrets Explained](https://blog.gitguardian.com/hmac-secrets-explained-authentication/) - Cryptographic details
- [StackHawk Open Redirect Guide](https://www.stackhawk.com/blog/what-is-open-redirect/) - Attack vectors and prevention
- [Complete Authentication Guide for Next.js App Router](https://clerk.com/articles/complete-authentication-guide-for-nextjs-app-router) - Multi-layer auth patterns

### Tertiary (LOW confidence)
- [Vibeappscanner Supabase RLS Guide](https://vibeappscanner.com/supabase-row-level-security) - Community tutorial (2026 date, verification needed)
- [Dev.to RLS for Beginners](https://dev.to/asheeshh/mastering-supabase-rls-row-level-security-as-a-beginner-5175) - Tutorial (simplified examples)
- [Dev.to Multi-Tenant RLS Architecture](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2) - Case study (single app, not verified)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are official Supabase/Next.js packages or Node.js built-ins, verified in current codebase
- Architecture: HIGH - Patterns are documented in official Supabase and Next.js documentation, verified with WebFetch
- Pitfalls: HIGH - Identified by analyzing current codebase (60% complete) and cross-referencing with official troubleshooting guides
- Code examples: HIGH - All examples sourced from official documentation or adapted from official patterns

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - Supabase and Next.js are stable, but security best practices evolve)
