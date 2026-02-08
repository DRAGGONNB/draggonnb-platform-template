# External Integrations

**Analysis Date:** 2026-02-01

## Integration Status Summary

| Integration | Status | Files |
|-------------|--------|-------|
| Supabase (Database + Auth) | **FULLY WORKING** | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts` |
| PayFast (Payments) | **FULLY WORKING** (sandbox) | `lib/payments/payfast.ts`, `app/api/webhooks/payfast/route.ts`, `app/api/payments/checkout/route.ts` |
| Resend (Email) | **SCAFFOLDED** (code complete, needs API key) | `lib/email/resend.ts`, `lib/email/types.ts`, `app/api/email/send/route.ts` |
| N8N (Automation) | **SCAFFOLDED** (client code complete, workflows inactive) | `lib/n8n/webhooks.ts`, `app/api/content/generate/route.ts` |
| Vercel (Hosting) | **FULLY WORKING** | `.vercel/project.json` |
| Anthropic Claude | **NOT STARTED** (called indirectly via N8N) | N/A |
| Social Platform APIs | **NOT STARTED** | N/A |
| GitHub (Provisioning) | **NOT STARTED** | N/A |

## APIs & External Services

### Supabase (Database + Authentication) - FULLY WORKING

**SDK:** `@supabase/ssr` ^0.5.0, `@supabase/supabase-js` ^2.45.0

**Client Setup - Browser (`lib/supabase/client.ts`):**
```typescript
import { createBrowserClient } from '@supabase/ssr'
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```
Use `createClient()` from `@/lib/supabase/client` in client components.

**Client Setup - Server (`lib/supabase/server.ts`):**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(url, key, { cookies: { get, set, remove } })
}
```
Use `createClient()` from `@/lib/supabase/server` in API routes and server components. This is an `async` function.

**Auth Middleware (`lib/supabase/middleware.ts`):**
- Called from `middleware.ts` at project root
- Refreshes Supabase auth session on every request via cookies
- Protected routes: `/dashboard` (redirects to `/login` if unauthenticated)
- Auth routes: `/login`, `/signup` (redirects to `/dashboard` if authenticated)
- Excluded from middleware: `_next/static`, `_next/image`, `favicon.ico`, `api/webhooks`, static assets

**Auth Helper (`lib/auth/get-user-org.ts`):**
```typescript
import { getUserOrg } from '@/lib/auth/get-user-org'
const { data: userOrg, error } = await getUserOrg()
// Returns: { userId, email, fullName, organizationId, role, organization: { id, name, subscription_tier, subscription_status } }
```
Use `getUserOrg()` in API routes when you need both user and organization data. Queries `users` table with joined `organizations` relation.

**Auth Pattern in API Routes (manual approach):**
Most API routes use this inline pattern instead of `getUserOrg()`:
```typescript
const supabase = await createClient()
const { data: { user }, error: authError } = await supabase.auth.getUser()
if (authError || !user) { return 401 }

const { data: userData } = await supabase
  .from('users')
  .select('organization_id')
  .eq('id', user.id)
  .single()
```

**Query Pattern (multi-tenant):**
All data queries MUST filter by `organization_id`:
```typescript
const { data, error } = await supabase
  .from('contacts')
  .select('*')
  .eq('organization_id', organizationId)
```

**Admin Client (setup only - `app/api/setup/route.ts`):**
Uses `createClient` from `@supabase/supabase-js` directly with `SUPABASE_SERVICE_ROLE_KEY` for admin operations. Protected by `SETUP_SECRET`.

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-only, setup API)
- `SUPABASE_ACCESS_TOKEN` - Management API token (for MCP/provisioning)

**Database Tables Referenced in Code:**
- `organizations` - Client companies (subscription_tier, subscription_status, payfast_subscription_token)
- `users` - Team members (organization_id FK, role, email, full_name)
- `contacts` - CRM contacts (organization_id, first_name, last_name, email, phone, company, tags)
- `deals` - Sales pipeline
- `companies` - Business records
- `email_templates` - Email template storage (html_content, subject, variables)
- `email_campaigns` - Campaign management
- `email_sequences` - Automated email sequences
- `email_sends` - Individual email send records with tracking
- `email_unsubscribes` - Unsubscribe records
- `subscription_history` - Payment transaction log
- `client_usage_metrics` - Usage tracking (emails_sent_monthly, ai_generations_monthly, monthly_posts_used)
- `content_queue` - Social media content queue

---

### PayFast (Payment Processing) - FULLY WORKING (sandbox)

**Implementation:** Custom integration (no SDK - direct API calls)
**Files:**
- `lib/payments/payfast.ts` (317 lines) - Core client with signature generation, verification, pricing tiers
- `app/api/webhooks/payfast/route.ts` (250 lines) - ITN webhook handler
- `app/api/payments/checkout/route.ts` (70 lines) - Checkout session creator

**How Checkout Works:**
1. Frontend calls `POST /api/payments/checkout` with `{ tier: 'starter' | 'professional' | 'enterprise' }`
2. API generates PayFast form data with MD5 signature via `createPayFastSubscription()`
3. Returns `{ paymentUrl, formData }` - frontend creates hidden HTML form and auto-submits to PayFast
4. User completes payment on PayFast hosted page
5. PayFast sends ITN (webhook) to `POST /api/webhooks/payfast`

**Webhook Security (3-step validation in `app/api/webhooks/payfast/route.ts`):**
1. `validatePayFastSignature()` - MD5 hash verification with passphrase
2. `verifyPayFastPayment()` - Server-to-server confirmation with PayFast
3. `validatePaymentAmount()` - Amount tampering prevention

**On Successful Payment:**
- Updates `organizations.subscription_status` to `'active'`
- Stores `pf_payment_id` as `payfast_subscription_token`
- Logs transaction to `subscription_history` (amount, fees, net)
- Resets `client_usage_metrics` monthly counters

**Pricing Tiers (defined in `lib/payments/payfast.ts`):**
- `starter`: R1,500/month (DRG-STARTER)
- `professional`: R3,500/month (DRG-PROFESSIONAL)
- `enterprise`: R7,500/month (DRG-ENTERPRISE)

**PayFast Subscription Data Flow:**
- `custom_str1` = organizationId
- `custom_str2` = planTier (starter/professional/enterprise)
- Subscription type: monthly recurring, 0 cycles (until cancelled)

**Environment Variables:**
- `PAYFAST_MERCHANT_ID` - Merchant identifier (sandbox: 10000100)
- `PAYFAST_MERCHANT_KEY` - Merchant key (sandbox: 46f0cd694581a)
- `PAYFAST_PASSPHRASE` - Signature passphrase (set in PayFast dashboard)
- `PAYFAST_MODE` - `sandbox` or `production`
- `PAYFAST_RETURN_URL` - Success redirect URL
- `PAYFAST_CANCEL_URL` - Cancel redirect URL
- `PAYFAST_NOTIFY_URL` - ITN webhook URL

**Current State:** Sandbox mode active. Production requires real PayFast merchant account credentials.

---

### Resend (Email Service) - SCAFFOLDED

**SDK:** `resend` ^6.7.0
**Files:**
- `lib/email/resend.ts` (340 lines) - Full email client with send, batch, tracking, templates
- `lib/email/types.ts` (459 lines) - Comprehensive TypeScript types for email system
- `app/api/email/send/route.ts` (309 lines) - Send API with usage limits, unsubscribe checking, tracking

**Capabilities Implemented:**
- Single email sending (`sendEmail()`)
- Batch email sending (`sendBatchEmails()`)
- Template variable substitution (`renderTemplate()` - `{{variable}}` syntax)
- Open tracking via 1x1 pixel (`addTrackingPixel()`)
- Click tracking via link wrapping (`wrapLinksForTracking()`)
- Unsubscribe URL generation (base64 encoded token with 30-day expiry)
- Email preferences URL generation
- HTML to plain text conversion
- Email validation and sanitization
- Per-tier usage limits (starter: 1000/mo, professional: 10000/mo, enterprise: unlimited)

**Send API Flow (`POST /api/email/send`):**
1. Check `isProviderConfigured()` (RESEND_API_KEY exists)
2. Authenticate user, get organization
3. Check email usage limits from `client_usage_metrics`
4. Load template from DB or use direct HTML
5. Filter out unsubscribed recipients from `email_unsubscribes`
6. For each recipient: render template, create `email_sends` record, add tracking, send via Resend
7. Update `client_usage_metrics.emails_sent_monthly`

**Additional Email API Routes (all in `app/api/email/`):**
- `POST /api/email/campaigns` - Campaign CRUD
- `POST /api/email/campaigns/[id]/send` - Send campaign
- `GET/POST /api/email/templates` - Template management
- `GET/POST /api/email/sequences` - Sequence management
- `GET/POST /api/email/sequences/[id]/steps` - Sequence step management
- `GET /api/email/analytics` - Email analytics
- `GET /api/email/track` - Open/click tracking endpoint
- `POST /api/email/webhooks` - Resend webhook handler
- `GET/POST /api/email/outreach` - Outreach rules

**Environment Variables:**
- `RESEND_API_KEY` - Resend API key (required for sending)
- `RESEND_WEBHOOK_SECRET` - Webhook signature verification
- `EMAIL_FROM` - Default sender email (default: `noreply@draggonnb.app`)
- `EMAIL_FROM_NAME` - Default sender name (default: `DraggonnB CRMM`)
- `EMAIL_REPLY_TO` - Reply-to address (default: `support@draggonnb.app`)

**Current State:** Code is complete and well-structured. Requires `RESEND_API_KEY` to be configured. No evidence of testing with real emails.

---

### N8N (Workflow Automation) - SCAFFOLDED

**Implementation:** Custom HTTP client (no SDK)
**File:** `lib/n8n/webhooks.ts` (177 lines)

**Webhook Functions Available:**
- `triggerContentGeneration()` - Generate social media content via Claude AI
- `triggerAnalytics()` - Fetch analytics data (daily/weekly/monthly)
- `testWebhookConnection()` - Test webhook connectivity
- `triggerClientProvisioning()` - Provision new client infrastructure
- `triggerLeadAnalysis()` - Qualify leads and analyze businesses

**How It Works:**
All functions call `fetch()` to N8N webhook URLs:
```typescript
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://draggonn-b.app.n8n.cloud'
const response = await fetch(`${N8N_BASE_URL}${process.env.N8N_WEBHOOK_CONTENT_GENERATOR}`, { ... })
```

**Content Generation API (`app/api/content/generate/route.ts`):**
- Authenticates user, checks AI generation usage limits per tier
- Calls N8N webhook at `${N8N_BASE_URL}/webhook/generate-content`
- Updates `client_usage_metrics.ai_generations_monthly` on success
- Tier limits: starter=50, professional=200, enterprise=unlimited

**Content Queue API (`app/api/content/queue/route.ts`):**
- Uses `getUserOrg()` helper for authentication
- Queries `content_queue` table filtered by organization

**N8N Workflow IDs (built but INACTIVE):**
- Social Content AI Generator: `1vvpVA3x2i7x4esw`
- Content Queue Processor: `Hai15bcpda5BVSWz`
- Analytics Collector: `V3Qq4VZazcDnSD0g`

**Environment Variables:**
- `N8N_API_URL` - N8N instance URL
- `N8N_API_KEY` - N8N JWT token
- `N8N_WEBHOOK_BASE_URL` - Webhook base URL
- `N8N_WEBHOOK_CONTENT_GENERATOR` - Content generator webhook path
- `N8N_WEBHOOK_ANALYTICS` - Analytics webhook path

**Current State:** Client-side code is complete. N8N workflows exist on https://draggonn-b.app.n8n.cloud but are INACTIVE - they need Supabase credentials and Anthropic API key configured in N8N before activation.

---

### Vercel (Hosting & Deployment) - FULLY WORKING

**Configuration:** `.vercel/project.json`
```json
{
  "projectId": "prj_U6tKRVq7GVPHQBfwO1Op59VoZHPH",
  "orgId": "team_363fHJl8ftRxVR5GUDzmcLqd",
  "projectName": "draggonnb-mvp"
}
```

**Live URL:** https://draggonnb-app.vercel.app
**Deployment:** Auto-deploy from GitHub on push to main
**Environment Variables:** All configured on Vercel dashboard (Supabase, PayFast sandbox, app URLs)

---

### Anthropic Claude AI - NOT DIRECTLY INTEGRATED

**SDK:** Not installed
**Approach:** Claude API is called indirectly through N8N workflows. The N8N workflow receives content generation requests and calls the Anthropic API.
**Environment Variable:** `ANTHROPIC_API_KEY` (listed in `.env.example`, consumed by N8N not by Next.js app)

---

### Social Platform APIs - NOT STARTED

No code exists for Facebook, Instagram, LinkedIn, or Twitter API integration. These are planned for N8N workflow integration.

---

### GitHub (Client Provisioning) - NOT STARTED

**Environment Variable:** `GITHUB_PERSONAL_ACCESS_TOKEN` (listed in `.env.example`)
**Planned Use:** Automated repository cloning for new client deployments
**Current State:** No implementation code exists

---

## Data Storage

**Database:**
- Supabase (hosted PostgreSQL)
- Project: `psqfgzbjbgqrmjskdavs`
- Connection: via `@supabase/ssr` client (not direct PostgreSQL)
- Schema: 65+ tables (CRM, email, social media, billing, analytics)
- RLS: Policy SQL exists in setup API but NOT confirmed enabled in production

**File Storage:**
- No file storage integration implemented
- Supabase Storage could be used but is not configured

**Caching:**
- None implemented

## Authentication & Identity

**Auth Provider:** Supabase Auth (built-in)
- Cookie-based sessions via `@supabase/ssr`
- Session refresh in Next.js middleware (`middleware.ts`)
- Login/signup pages exist at `/login`, `/signup`, `/forgot-password`
- Multi-tenant: users belong to organizations via `users.organization_id`

**Auth Flow:**
1. `middleware.ts` calls `updateSession()` from `lib/supabase/middleware.ts`
2. Middleware refreshes Supabase auth cookies on every request
3. Protected routes (`/dashboard`) redirect to `/login` if no session
4. Auth routes (`/login`, `/signup`) redirect to `/dashboard` if session exists
5. API routes call `supabase.auth.getUser()` then query `users` table for `organization_id`

## Monitoring & Observability

**Error Tracking:** None (no Sentry or similar)
**Logs:** `console.log`/`console.error` only (visible in Vercel deployment logs)
**Uptime Monitoring:** None configured

## CI/CD & Deployment

**Hosting:** Vercel
**CI Pipeline:** None (no GitHub Actions, no pre-commit hooks, no automated tests)
**Deploy Process:** Push to main branch -> Vercel auto-deploys
**Manual Deploy:** `vercel --prod --yes`

## Environment Configuration

**Required env vars (minimum for dev):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

**Required for full functionality:**
- `SUPABASE_SERVICE_ROLE_KEY` - Admin database operations
- `PAYFAST_MERCHANT_ID` - Payment processing
- `PAYFAST_MERCHANT_KEY` - Payment processing
- `PAYFAST_PASSPHRASE` - Payment signature verification
- `PAYFAST_MODE` - sandbox/production
- `PAYFAST_RETURN_URL`, `PAYFAST_CANCEL_URL`, `PAYFAST_NOTIFY_URL` - Payment flow URLs
- `RESEND_API_KEY` - Email sending
- `EMAIL_FROM`, `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO` - Email sender config
- `N8N_BASE_URL` - Automation webhook base URL
- `SETUP_SECRET` - Database setup API protection

**Optional:**
- `RESEND_WEBHOOK_SECRET` - Email webhook verification
- `N8N_API_URL`, `N8N_API_KEY` - N8N management API
- `ANTHROPIC_API_KEY` - AI (consumed by N8N)
- `GITHUB_PERSONAL_ACCESS_TOKEN` - Client provisioning
- `VERCEL_TOKEN` - Deployment automation
- `SUPABASE_ACCESS_TOKEN` - Supabase management API

**Secrets Location:** Vercel dashboard (production), `.env.local` (development, gitignored)

## Webhooks & Callbacks

**Incoming:**
- `POST /api/webhooks/payfast` - PayFast ITN (payment notifications) - **WORKING**
- `POST /api/email/webhooks` - Resend email event webhooks - **SCAFFOLDED**
- `GET /api/email/track` - Email open/click tracking pixel - **SCAFFOLDED**

**Outgoing:**
- N8N webhook calls from `lib/n8n/webhooks.ts` - **SCAFFOLDED** (5 webhook functions defined)
- PayFast server verification call from `lib/payments/payfast.ts` - **WORKING**

---

*Integration audit: 2026-02-01*
