# Architecture

**Analysis Date:** 2026-02-01

## Pattern Overview

**Overall:** Next.js 14 App Router with Server Components, Route Groups, and Supabase Backend

**Key Characteristics:**
- Server-first rendering with Server Components for data fetching pages (dashboard, CRM)
- Client Components (`'use client'`) for interactive pages (email hub, pricing, sidebar)
- Route groups `(dashboard)` and `(auth)` for layout segmentation
- API routes as thin CRUD proxies directly to Supabase (no N8N intermediary yet)
- Multi-tenant isolation via `organization_id` filtering on every query
- Server Actions for authentication flows (`lib/auth/actions.ts`)

## Layers

**Presentation Layer (Pages):**
- Purpose: Render UI, fetch data server-side, handle user interactions
- Location: `app/` directory (pages) + `components/` directory (reusable UI)
- Contains: Server Components (data pages), Client Components (interactive pages)
- Depends on: `lib/supabase/server.ts`, `lib/auth/get-user-org.ts`, `components/`
- Used by: End users via browser

**API Layer (Route Handlers):**
- Purpose: CRUD operations, webhook processing, payment handling
- Location: `app/api/`
- Contains: Next.js Route Handlers (GET, POST, PUT, DELETE)
- Depends on: `lib/supabase/server.ts`, `lib/payments/payfast.ts`, `lib/email/resend.ts`
- Used by: Frontend pages (fetch calls), external services (PayFast ITN webhooks)

**Authentication Layer:**
- Purpose: Session management, user auth, route protection
- Location: `middleware.ts`, `lib/supabase/middleware.ts`, `lib/auth/actions.ts`
- Contains: Middleware for session refresh, Server Actions for login/signup/logout
- Depends on: `@supabase/ssr`, Supabase Auth
- Used by: All protected routes

**Data Access Layer:**
- Purpose: Supabase client creation for server and browser contexts
- Location: `lib/supabase/server.ts` (server), `lib/supabase/client.ts` (browser)
- Contains: Cookie-based Supabase client factories
- Depends on: `@supabase/ssr`, environment variables
- Used by: All pages and API routes

**Business Logic Layer:**
- Purpose: Domain logic for payments, email, N8N integration
- Location: `lib/payments/payfast.ts`, `lib/email/resend.ts`, `lib/n8n/webhooks.ts`, `lib/email/types.ts`
- Contains: PayFast signature generation/validation, Resend email sending, N8N webhook triggers, type definitions
- Depends on: Environment variables, external APIs
- Used by: API routes

## Data Flow

**Authenticated Page Request (e.g., Dashboard):**

1. Browser requests `/dashboard`
2. `middleware.ts` intercepts, calls `updateSession()` from `lib/supabase/middleware.ts`
3. Middleware creates server Supabase client, calls `supabase.auth.getUser()` to refresh session cookies
4. Middleware checks if route is protected (`/dashboard` prefix) - redirects to `/login` if unauthenticated
5. `app/(dashboard)/dashboard/page.tsx` (Server Component) calls `getUserOrg()` to get user + organization
6. Page fetches organization-scoped data from Supabase (usage metrics, posts, analytics)
7. Page renders with real data, passes to client sub-components (charts, stat cards)

**API Route Request (e.g., Create Contact):**

1. Frontend sends POST to `/api/crm/contacts` with JSON body
2. Route handler creates server Supabase client via `createClient()` from `lib/supabase/server.ts`
3. Authenticates: `supabase.auth.getUser()` - returns 401 if invalid
4. Resolves organization: queries `users` table for `organization_id` by `user.id`
5. Inserts record with `organization_id` set for tenant isolation
6. Returns JSON response

**Payment Flow:**

1. User visits `/pricing` (client component) - displays tiers from `PRICING_TIERS` in `lib/payments/payfast.ts`
2. User clicks tier - redirected to `/signup?tier={tierId}` (currently; checkout API exists but pricing page redirects to signup)
3. Authenticated checkout: POST `/api/payments/checkout` calls `getUserOrg()` then `createPayFastSubscription()`
4. Returns PayFast form data + URL; frontend creates hidden form and submits to PayFast
5. PayFast processes payment, sends ITN POST to `/api/webhooks/payfast`
6. Webhook validates signature (`validatePayFastSignature()`), verifies with PayFast server (`verifyPayFastPayment()`), validates amount
7. Updates `organizations` table (`subscription_status`, `payfast_subscription_token`)
8. Logs to `subscription_history`, resets `client_usage_metrics`

**Email Send Flow:**

1. POST `/api/email/send` with `to`, `subject`, `template_id` or `html`
2. Authenticates user, resolves organization
3. Checks subscription tier limits via `TIER_EMAIL_LIMITS` from `lib/email/types.ts`
4. Checks monthly email usage from `client_usage_metrics`
5. Filters unsubscribed recipients from `email_unsubscribes` table
6. Loads template from `email_templates` if `template_id` provided
7. For each recipient: renders template variables, creates `email_sends` record, adds tracking pixel/link wrapping
8. Sends via Resend (`lib/email/resend.ts`), updates `email_sends` status
9. Updates `client_usage_metrics` with send count

**State Management:**
- Server Components: Data fetched at render time via Supabase queries (no client state)
- Client Components: React `useState`/`useEffect` with direct Supabase browser client queries (e.g., email hub page)
- No global state management library in active use (Zustand is installed but not used)
- Auth state managed by Supabase session cookies (refreshed by middleware)

## Key Abstractions

**getUserOrg():**
- Purpose: Central auth + tenant resolution for server contexts
- Location: `lib/auth/get-user-org.ts`
- Pattern: Calls `supabase.auth.getUser()`, then joins `users` with `organizations` via foreign key
- Returns: `{ userId, email, fullName, organizationId, role, organization: { id, name, subscription_tier, subscription_status } }`
- Used by: Dashboard page, CRM page, checkout API

**Inline Auth + Org Resolution:**
- Purpose: Same as getUserOrg but done inline in API routes
- Pattern: Most API routes duplicate the auth+org pattern instead of using `getUserOrg()`
- Location: `app/api/crm/contacts/route.ts`, `app/api/email/campaigns/route.ts`, etc.
- Pattern:
  ```typescript
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return 401
  const { data: userData } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
  if (!userData?.organization_id) return 400
  ```

**createClient() (Server):**
- Purpose: Create authenticated Supabase client for Server Components and API routes
- Location: `lib/supabase/server.ts`
- Pattern: Uses `@supabase/ssr` `createServerClient` with Next.js `cookies()` for cookie management
- Used by: All server-side code

**createClient() (Browser):**
- Purpose: Create Supabase client for Client Components
- Location: `lib/supabase/client.ts`
- Pattern: Uses `@supabase/ssr` `createBrowserClient` with public env vars
- Used by: Email hub page, other client-side data fetching

**PRICING_TIERS:**
- Purpose: Single source of truth for pricing configuration
- Location: `lib/payments/payfast.ts`
- Pattern: Record keyed by tier slug (`starter`, `professional`, `enterprise`) with price, features, item codes
- Used by: Pricing page, checkout API, webhook validation

**TIER_EMAIL_LIMITS:**
- Purpose: Email sending limits per subscription tier
- Location: `lib/email/types.ts`
- Pattern: Record keyed by tier slug with monthly limits for emails, templates, campaigns, sequences
- Used by: Email send API for quota enforcement

## Entry Points

**Root Layout:**
- Location: `app/layout.tsx`
- Triggers: Every page render
- Responsibilities: Sets HTML lang, loads Inter + Space Grotesk fonts, renders children

**Dashboard Layout:**
- Location: `app/(dashboard)/layout.tsx`
- Triggers: All pages within `(dashboard)` route group
- Responsibilities: Renders `Sidebar` and `DashboardHeader`, wraps children in main content area with `ml-64` offset

**Middleware:**
- Location: `middleware.ts`
- Triggers: All requests except static files, images, favicon, and `/api/webhooks/*`
- Responsibilities: Refreshes Supabase auth session cookies, protects `/dashboard` routes, redirects authenticated users away from `/login` and `/signup`

**Auth Callback:**
- Location: `app/auth/callback/route.ts`
- Triggers: OAuth/magic link redirects from Supabase Auth
- Responsibilities: Exchanges auth code for session, redirects to dashboard or specified `next` URL

**PayFast Webhook:**
- Location: `app/api/webhooks/payfast/route.ts`
- Triggers: PayFast ITN notifications (POST)
- Responsibilities: 3-step validation (signature, server verify, amount), updates organization subscription status, logs transactions

## Error Handling

**Strategy:** Try-catch with HTTP status codes and JSON error responses

**Patterns:**
- Every API route wraps handler in `try { ... } catch (error) { return 500 }`
- Auth failures return 401 with `{ error: 'Unauthorized' }`
- Missing organization returns 400 with `{ error: 'Organization not found' }`
- Supabase query errors logged with `console.error()`, return 500 with generic message
- Duplicate records (e.g., contact email) caught via Postgres error code `23505`, return 409
- Email quota exceeded returns 429 with current/limit/requested counts
- PayFast webhook returns specific error messages for each validation step

**Missing error handling:**
- Server Components silently redirect to `/login` on auth failure (no error feedback)
- Dashboard data fetches have no error boundary - partial data renders with fallback values (e.g., `data.usage?.posts_monthly || 87`)
- No global error boundary component

## Cross-Cutting Concerns

**Logging:**
- `console.error()` and `console.log()` throughout API routes and webhook handlers
- No structured logging framework
- PayFast webhook has step-by-step console logs with checkmark emojis

**Validation:**
- Manual field checking in API routes (e.g., `if (!first_name || !email)`)
- No Zod validation in API routes despite Zod being a dependency
- PayFast uses MD5 signature validation + server-to-server verification
- Email validation via regex in `lib/email/resend.ts`

**Authentication:**
- Supabase Auth with cookie-based sessions
- Middleware refreshes sessions on every request (except webhooks/static)
- Only `/dashboard` prefix is protected by middleware redirect
- API routes check auth individually (no middleware-level API protection)
- Webhook endpoints excluded from middleware via matcher pattern

**Multi-Tenancy:**
- Every data query includes `.eq('organization_id', organizationId)` filter
- Organization ID resolved per-request from authenticated user's `users` table record
- No database-level RLS policies currently enforced (documented as blocker)
- Signup creates organization record and links user via `organization_id` foreign key

**Email Tracking:**
- Open tracking via 1x1 pixel image (`/api/email/track/open?id={sendId}`)
- Click tracking via link wrapping (`/api/email/track/click?id={sendId}&url={encodedUrl}`)
- Unsubscribe links generated per-organization with base64 token
- All tracking added by `lib/email/resend.ts` helpers before sending

---

*Architecture analysis: 2026-02-01*
