# Codebase Concerns

**Analysis Date:** 2026-02-01

## Security Concerns

**Supabase RLS Policies - Written But Likely Not Applied:**
- Issue: RLS policy SQL files exist in `supabase/migrations/01_rls_policies.sql`, `supabase/migrations/02_email_automation.sql`, and `supabase/migrations/03_crm_tables.sql`, but there is no evidence these migrations have been executed against the production Supabase instance. The CLAUDE.md explicitly states "RLS policies pending" and "Supabase RLS must be enabled before ANY user access."
- Files: `supabase/migrations/01_rls_policies.sql`, `supabase/migrations/02_email_automation.sql`, `supabase/migrations/03_crm_tables.sql`
- Impact: **CRITICAL** - Without RLS, any authenticated user with the anon key can read/write all data in all tables. The anon key is exposed in client-side JavaScript (`NEXT_PUBLIC_SUPABASE_ANON_KEY`), so any user could directly query the Supabase REST API and access any organization's data.
- Fix approach: Run all migration SQL files against the production Supabase instance. Verify with `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`. Test that cross-organization data access is blocked.

**Setup API Has Hardcoded Default Secret:**
- Issue: The setup endpoint at `app/api/setup/route.ts` line 8 has a hardcoded default secret: `const SETUP_SECRET = process.env.SETUP_SECRET || 'draggonnb-setup-2024'`. If `SETUP_SECRET` env var is not set, the fallback is guessable. This endpoint uses the service role key and can probe database structure.
- Files: `app/api/setup/route.ts` (line 8)
- Impact: Medium - Allows unauthenticated database probing if the env var is not set.
- Fix approach: Remove the fallback default. Fail if `SETUP_SECRET` is not set. Consider disabling the endpoint entirely in production.

**Middleware Only Protects `/dashboard` Routes:**
- Issue: The auth middleware at `lib/supabase/middleware.ts` lines 60-61 only protects routes starting with `/dashboard`. All other dashboard routes under `(dashboard)/` group (CRM, email, billing, analytics, etc.) are NOT protected at the middleware level. They rely solely on API-level auth checks.
- Files: `lib/supabase/middleware.ts` (line 60)
- Impact: Medium - Server-side page components for CRM, email, billing, etc. may render without authentication. The API routes do check auth individually, but the pages themselves may flash or partially render. The route group `(dashboard)` does NOT add `/dashboard` prefix to URLs.
- Fix approach: Expand `protectedRoutes` to include all dashboard sub-paths: `/crm`, `/email`, `/billing`, `/analytics`, `/content`, `/settings`, `/team`, `/accounts`, `/approvals`, `/calendar`, `/generate`. Or use a broader pattern matching the `(dashboard)` layout.

**PayFast Webhook Uses Anon Key, Not Service Role:**
- Issue: The PayFast webhook at `app/api/webhooks/payfast/route.ts` line 105 creates a Supabase client using `createClient()` from `lib/supabase/server.ts`, which uses the anon key (not the service role key). The webhook needs to update `organizations`, `subscription_history`, and `client_usage_metrics` tables. If RLS is enabled, these writes will fail because the webhook has no authenticated user context.
- Files: `app/api/webhooks/payfast/route.ts` (line 105), `lib/supabase/server.ts`
- Impact: **HIGH** - Once RLS is enabled, all PayFast webhook database operations will silently fail. Subscriptions won't activate, payments won't be logged.
- Fix approach: Create a separate Supabase admin client using `SUPABASE_SERVICE_ROLE_KEY` for webhook handlers. The Resend email webhook at `app/api/email/webhooks/route.ts` has the same issue.

**Unsubscribe Token Uses Base64 Encoding, Not Signed Tokens:**
- Issue: The unsubscribe URL generation at `lib/email/resend.ts` lines 241-249 creates tokens using simple Base64 encoding of JSON. There is no HMAC signature or encryption. Anyone can decode the token, modify the email/org, re-encode, and unsubscribe arbitrary emails.
- Files: `lib/email/resend.ts` (lines 241-249, 254-264)
- Impact: Medium - Allows forged unsubscribe requests for any email address in any organization.
- Fix approach: Sign the token with HMAC using a server-side secret. Verify the signature on the unsubscribe endpoint.

**Email Tracking Click Endpoint Has Open Redirect:**
- Issue: The email click tracking at `app/api/email/track/route.ts` lines 86 and 123 decodes a URL from the query parameter and performs a 302 redirect to it. There is no validation that the URL is a legitimate destination. This can be abused for phishing.
- Files: `app/api/email/track/route.ts` (lines 86, 123)
- Impact: Medium - Open redirect vulnerability usable for phishing campaigns.
- Fix approach: Validate redirect URLs against an allowlist or at minimum reject `javascript:` and data URIs. Consider only allowing `http://` and `https://` schemes.

**SQL Injection via Search Parameters:**
- Issue: CRM search endpoints inject user-provided search strings directly into Supabase `.or()` filter strings without sanitization. For example, `app/api/crm/contacts/route.ts` line 43: `query = query.or(\`first_name.ilike.%${search}%,...\`)`. While Supabase PostgREST does parameterize queries, the `.or()` string interpolation could allow filter injection.
- Files: `app/api/crm/contacts/route.ts` (line 43), `app/api/crm/deals/route.ts` (line 39), `app/api/crm/companies/route.ts` (line 38), `app/api/email/campaigns/route.ts` (line 50), `app/api/email/templates/route.ts` (line 55)
- Impact: Low-Medium - Could allow filter manipulation to bypass intended query constraints.
- Fix approach: Sanitize search input by escaping special PostgREST filter characters (`.`, `,`, `(`, `)`) before interpolation, or use individual `.ilike()` calls instead.

**CORS Header Uses Environment Variable at Build Time:**
- Issue: `next.config.js` line 18 sets `Access-Control-Allow-Origin` to `process.env.NEXT_PUBLIC_APP_URL || 'https://draggonnb.app'`. The `NEXT_PUBLIC_APP_URL` on Vercel is `https://draggonnb-app.vercel.app` but the fallback is `https://draggonnb.app`. If the env var is not set at build time, CORS will reject requests from the actual deployment domain.
- Files: `next.config.js` (line 18)
- Impact: Low - CORS misconfiguration could block legitimate API calls from the frontend.
- Fix approach: Ensure `NEXT_PUBLIC_APP_URL` is always set in the build environment. Consider allowing both the Vercel domain and custom domain.

## Tech Debt

**Signup Flow Race Condition - Organization Not Linked to User:**
- Issue: In `lib/auth/actions.ts` lines 52-78, the signup flow creates an organization (line 53) and then a user record (line 68), but never links the user to the organization via `organization_id`. The `users.insert` at line 68 does not include `organization_id`. The `getUserOrg()` helper at `lib/auth/get-user-org.ts` queries `users.organization_id`, which will be `null` for all signup users.
- Files: `lib/auth/actions.ts` (lines 52-78), `lib/auth/get-user-org.ts`
- Impact: **CRITICAL** - No user created through the signup flow will have a working organization association. All authenticated API calls that use `getUserOrg()` or query `users.organization_id` will fail with "Organization not found" for every new user.
- Fix approach: After creating the organization, retrieve its generated `id` and include `organization_id` in the user insert. Also add transaction/rollback logic for the case where org creation succeeds but user creation fails.

**Dashboard Uses Hardcoded Fallback Data:**
- Issue: The dashboard page at `app/(dashboard)/dashboard/page.tsx` lines 66-69 uses hardcoded fallback values when database returns null: `postsCount` defaults to `87`, `engagementRate` to `4.8`, `contactsCount` is derived from `recentPosts.length` with fallback `34`, and `revenueImpact` is always `'R12.5k'` (hardcoded string, line 69). The "Upcoming Posts" section (lines 154-163) and "Usage & Limits" section (lines 167-181) show hardcoded static values (`"3 posts scheduled"`, `"2.3GB / 5GB"`).
- Files: `app/(dashboard)/dashboard/page.tsx` (lines 66-69, 154-163, 167-181)
- Impact: Medium - Users see fake data that doesn't reflect their actual usage. Misleading for paying customers.
- Fix approach: Replace hardcoded fallbacks with `0` or "No data" states. Connect "Upcoming Posts" and "Usage & Limits" widgets to real database queries.

**Dashboard Components Use Fake Default Data:**
- Issue: Multiple dashboard components render fake placeholder data when no real data is provided.
- Files: `components/dashboard/ActivityFeed.tsx` (lines 13-35 - fake users "Sarah", "Mike", "Alex"), `components/dashboard/BestPostingTimes.tsx` (lines 11-15 - fake posting times), `components/dashboard/TopPerformingPosts.tsx` (lines 11-14 - fake posts)
- Impact: Medium - Same as above. Users see fictional team activity and engagement data.
- Fix approach: Show empty states instead of fake data. Fetch real data from Supabase.

**N8N Webhook URLs Depend on Unset Environment Variables:**
- Issue: `lib/n8n/webhooks.ts` uses `process.env.N8N_WEBHOOK_CONTENT_GENERATOR` and `process.env.N8N_WEBHOOK_ANALYTICS` (lines 27, 62) but these env vars are not documented in `.env.example`. The content generation API at `app/api/content/generate/route.ts` line 87 constructs the URL as `${process.env.N8N_BASE_URL}/webhook/generate-content` using a different env var (`N8N_BASE_URL`) that is also not in `.env.example` (which uses `N8N_API_URL` instead).
- Files: `lib/n8n/webhooks.ts` (lines 6, 27, 62), `app/api/content/generate/route.ts` (line 87), `.env.example`
- Impact: High - Content generation and analytics features will always fail with network errors. The N8N workflows are also documented as inactive.
- Fix approach: Align env var naming between `.env.example`, `lib/n8n/webhooks.ts`, and `app/api/content/generate/route.ts`. Add `N8N_BASE_URL`, `N8N_WEBHOOK_CONTENT_GENERATOR`, and `N8N_WEBHOOK_ANALYTICS` to `.env.example`.

**Email System Depends on Resend API Key That Is Not Configured:**
- Issue: The entire email system (`lib/email/resend.ts`) requires `RESEND_API_KEY` environment variable. The email send API gracefully returns 503 when unconfigured, but all email features (campaigns, sequences, send) will be non-functional without it.
- Files: `lib/email/resend.ts` (line 19), `app/api/email/send/route.ts` (line 31)
- Impact: High - The email management module (campaigns, templates, sequences) appears functional in the UI but cannot actually send emails.
- Fix approach: Add a visible banner in the email UI sections when `RESEND_API_KEY` is not configured. Ensure Resend account is created and API key is set.

**TODO Comments Indicate Incomplete Webhook Logic:**
- Issue: The PayFast webhook handler has 3 TODO comments for unimplemented functionality.
- Files: `app/api/webhooks/payfast/route.ts` (lines 155-156, 181)
- Impact: Medium - Welcome emails not sent on successful payment. Client provisioning not triggered. Payment failure notifications not sent.
- Fix approach: Implement email sending via Resend for payment success/failure notifications. Wire up client provisioning workflow.

**Campaign Send Targets Wrong Recipients:**
- Issue: The campaign send endpoint at `app/api/email/campaigns/[id]/send/route.ts` lines 110-113 gets recipients by querying the `users` table for org members instead of the `contacts` table. Email campaigns should target contacts/leads, not internal team users. The code comment on line 109 acknowledges this: "For now, we'll get all users in the organization."
- Files: `app/api/email/campaigns/[id]/send/route.ts` (lines 108-113)
- Impact: High - Campaigns send to team members instead of actual marketing contacts. This is fundamentally broken for a CRM email campaign feature.
- Fix approach: Query the `contacts` table filtered by `organization_id` and campaign segment rules. Add recipient list management to campaigns.

## Data Integrity

**Database Tables Referenced But May Not Exist:**
- Issue: The application code references many Supabase tables that may not have been created yet. The migration files exist but may not have been run. Key tables referenced across API routes include: `contacts`, `companies`, `deals`, `content_queue`, `email_templates`, `email_campaigns`, `email_sequences`, `email_sequence_steps`, `email_sends`, `email_unsubscribes`, `outreach_rules`, `sequence_enrollments`, `social_posts`, `analytics_snapshots`, `platform_metrics`, `client_usage_metrics`, `subscription_history`, `organizations`, `users`.
- Files: All files in `supabase/migrations/` (4 migration files), all API routes in `app/api/`
- Impact: High - If migrations haven't been run, most API endpoints will return 500 errors.
- Fix approach: Create a migration verification script. Run all migrations in order: `00_initial_schema.sql`, `01_add_missing_tables.sql`, `01_rls_policies.sql`, `02_email_automation.sql`, `03_crm_tables.sql`. Verify all tables exist.

**Organization-Scoping Gaps:**
- Issue: Most API routes properly scope queries by `organization_id`, which is good. However, the email tracking endpoint at `app/api/email/track/route.ts` queries `email_sends` by `id` only (lines 45-49, 92-96) without verifying organization ownership. This means any user with an email send ID can track/modify another org's email records.
- Files: `app/api/email/track/route.ts` (lines 45-49, 92-96)
- Impact: Low - The tracking endpoint is typically called by email clients loading tracking pixels, not by authenticated users. But the email send ID is exposed in email HTML.
- Fix approach: Accept that tracking pixels are inherently public (by design). No fix needed for this specific case, but ensure sensitive operations always scope by org.

**Usage Metrics Update Race Condition:**
- Issue: Email send endpoints read `emails_sent_monthly`, add to it locally, then write back. If two campaign sends happen concurrently for the same org, they could both read the same initial value and overwrite each other's increment. Same issue in `app/api/content/generate/route.ts` with `ai_generations_monthly`.
- Files: `app/api/email/send/route.ts` (lines 83-90, 279-286), `app/api/email/campaigns/[id]/send/route.ts` (lines 68-74, 272-280), `app/api/content/generate/route.ts` (lines 66-72, 111-117)
- Impact: Low-Medium - Under concurrency, usage counts could be inaccurate, allowing users to exceed limits.
- Fix approach: Use PostgreSQL `UPDATE ... SET counter = counter + N` pattern via Supabase RPC instead of read-then-write.

## Performance Concerns

**Email Campaign Sends Are Sequential:**
- Issue: The campaign send endpoint at `app/api/email/campaigns/[id]/send/route.ts` sends emails one-by-one in a `for` loop (line 168). For campaigns with hundreds of recipients, this will be extremely slow and may timeout the API route.
- Files: `app/api/email/campaigns/[id]/send/route.ts` (lines 168-252)
- Impact: High - Large campaigns will timeout. Vercel serverless functions have a 10-second (hobby) or 60-second (pro) execution limit.
- Fix approach: Use Resend's batch API (`sendBatchEmails` already exists in `lib/email/resend.ts` line 91 but is unused). Or queue individual sends to a background job system.

**Email Analytics Fetches All Records Into Memory:**
- Issue: The analytics endpoint at `app/api/email/analytics/route.ts` lines 55-60 fetches ALL email sends for the organization within the date range, then filters/aggregates in JavaScript. For organizations with thousands of email sends, this loads everything into memory.
- Files: `app/api/email/analytics/route.ts` (lines 55-60, 102-107)
- Impact: Medium - Will become slow as email volume grows. Memory pressure on serverless functions.
- Fix approach: Use PostgreSQL aggregation functions via Supabase RPC or views instead of client-side aggregation.

**Dashboard Makes Multiple Sequential Database Queries:**
- Issue: The dashboard page at `app/(dashboard)/dashboard/page.tsx` function `getDashboardData()` makes 4 sequential Supabase queries (lines 15-50) that could run in parallel.
- Files: `app/(dashboard)/dashboard/page.tsx` (lines 11-51)
- Impact: Low - Adds latency to dashboard load time. Each query adds ~50-200ms.
- Fix approach: Use `Promise.all()` to run all 4 queries concurrently.

**Heavy Dependencies for Unused Features:**
- Issue: `react-big-calendar` (line 38 in `package.json`) and `react-email-editor` (line 39) are included as dependencies but the calendar page and email editor may not be fully utilized. These are large packages.
- Files: `package.json` (lines 38-39)
- Impact: Low - Increases bundle size and install time.
- Fix approach: Audit whether these packages are actually imported. Remove if unused or use dynamic imports.

## Deployment Concerns

**Missing `NEXT_PUBLIC_APP_URL` in .env.example:**
- Issue: The `.env.example` file does not include `NEXT_PUBLIC_APP_URL`, which is used in `lib/email/resend.ts` (line 25), `lib/payments/payfast.ts` (lines 218-220), and `next.config.js` (line 18) for CORS. On Vercel it is set, but local development will use `http://localhost:3000` fallback which won't work for webhooks.
- Files: `.env.example`, `lib/email/resend.ts` (line 25), `lib/payments/payfast.ts` (lines 218-220)
- Impact: Medium - Local development webhook testing won't work. CORS might be misconfigured.
- Fix approach: Add `NEXT_PUBLIC_APP_URL` to `.env.example` with a comment explaining it should be the public URL.

**N8N Environment Variables Mismatch:**
- Issue: `.env.example` defines `N8N_API_URL` and `N8N_API_KEY`, but the codebase uses `N8N_BASE_URL` (in `lib/n8n/webhooks.ts` line 6 with fallback) and `N8N_WEBHOOK_CONTENT_GENERATOR` / `N8N_WEBHOOK_ANALYTICS` (which are not in `.env.example` at all).
- Files: `.env.example` (lines 34-36), `lib/n8n/webhooks.ts` (lines 6, 27, 62), `app/api/content/generate/route.ts` (line 87)
- Impact: High - N8N integration will fail silently. The hardcoded fallback `https://draggonn-b.app.n8n.cloud` in webhooks.ts may work but specific webhook paths won't resolve.
- Fix approach: Standardize on one set of N8N env var names across the entire codebase and `.env.example`.

**PAYFAST_PASSPHRASE Not Set in Production:**
- Issue: The PayFast signature validation at `app/api/webhooks/payfast/route.ts` line 41 reads `PAYFAST_PASSPHRASE` from env. In sandbox mode this may be empty/optional, but in production it is required for signature validation. If not set, signature validation becomes weaker.
- Files: `app/api/webhooks/payfast/route.ts` (line 41), `lib/payments/payfast.ts` (line 141)
- Impact: Medium - In production, missing passphrase would weaken payment webhook security.
- Fix approach: Make `PAYFAST_PASSPHRASE` required when `PAYFAST_MODE=production`. Log a warning at startup if not set.

**`next.config.js` Image Domains Include Placeholder:**
- Issue: `next.config.js` line 7 includes `'your-project.supabase.co'` as an allowed image domain, which is a placeholder that was never updated.
- Files: `next.config.js` (line 7)
- Impact: None functionally, but indicates incomplete configuration cleanup.
- Fix approach: Replace with `psqfgzbjbgqrmjskdavs.supabase.co` (the actual project) or remove if not needed.

## Test Coverage Gaps

**No Tests Exist:**
- Issue: There are zero test files in the entire codebase. No unit tests, no integration tests, no e2e tests. No test framework is configured (no jest.config, vitest.config, playwright.config, or cypress.config).
- Files: None - no `*.test.*` or `*.spec.*` files found
- Impact: **HIGH** - No automated verification of any functionality. Every change risks breaking existing features without detection.
- Fix approach: Add Vitest for unit/integration tests. Prioritize testing: (1) PayFast signature validation, (2) auth middleware, (3) CRM API routes, (4) email send flow. Add Playwright for e2e smoke tests of critical flows (signup, login, create contact).
- Priority: High

**PayFast Signature Validation Not Tested:**
- Issue: The MD5 signature generation and validation logic in `lib/payments/payfast.ts` handles real money. Any bug in signature calculation could either reject legitimate payments or accept forged ones.
- Files: `lib/payments/payfast.ts` (lines 163-197)
- Impact: High - Financial integrity risk.
- Fix approach: Write unit tests with known PayFast test vectors to verify signature generation matches expected output.
- Priority: High

**Signup Flow Not Tested End-to-End:**
- Issue: The signup flow in `lib/auth/actions.ts` creates auth user, organization, and user record in sequence with no tests verifying the complete flow or error recovery.
- Files: `lib/auth/actions.ts` (lines 25-83)
- Impact: High - The identified bug (missing `organization_id` linkage) would have been caught by even a basic integration test.
- Fix approach: Write integration tests for signup, login, and password reset flows.
- Priority: High

---

*Concerns audit: 2026-02-01*
