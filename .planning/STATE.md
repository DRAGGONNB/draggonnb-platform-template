# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** Complete multi-tenant B2B operating system for South African SMEs. Shared Supabase DB with RLS-based tenant isolation, wildcard subdomain routing, DB-backed module gating, automated provisioning.
**Current stats:** 84 DB tables live, 166 API routes, 17+ UI modules, 4 AI agents, 17 N8N workflow templates, 241 tests. Build passing.

## Current Position

Phase: Meta Business API Integration (Phase 08) — IN PROGRESS
Plan: v1 roadmap complete (7/7 phases). BOS v2 complete. Architecture restructure complete. Accommodation base + Automation Layer + Management UI all complete. Phase 08 Meta integration planned (5 sub-phases).
Status: DEPLOYED TO PRODUCTION. Live at https://draggonnb-platform.vercel.app
Last activity: 2026-03-15 -- Session 40: Meta integration planning + Phase 08.2/08.3 implementation
Progress: 84 DB tables + RLS live in Supabase. 170 API routes (4 new Meta/onboarding). 17+ UI modules. 4 AI agents. 17 N8N workflows deployed to VPS (13+3 pre-existing+1 billing monitor). 241 tests. TypeScript build passing (0 source errors).

## Accumulated Context

### Decisions

- Shared DB + RLS multi-tenant (replaces per-client Supabase isolation)
- Single Vercel deployment with wildcard subdomain routing (*.draggonnb.co.za)
- DB-backed module registry + tenant_modules for feature gating
- Hierarchical CLAUDE.md: root + 3 sub-directory build specs (agents, provisioning, API)
- Error catalogue as JSON knowledge base (.planning/errors/catalogue.json)
- No autonomous sub-agents per client until 20+ clients
- Ops dashboard tables designed but deferred until 5+ clients
- Brand identity: light theme with Brand Crimson (HSL 348) + Charcoal (HSL 220) palette
- Sidebar: Lucide icons with crimson active states, branded "DraggonnB OS"
- AI Agents surfaced as dedicated sidebar section (Autopilot, AI Workflows, Agent Settings)
- Protected pages use inline error states (never redirect to /login) to prevent redirect loops
- Auth uses `organization_users` junction table (not a `users` table) to link auth users to organizations
- `getUserOrg()` queries junction table with admin client fallback, auto-creates missing records
- Supabase service role key rotated (2026-03-05) after accidental exposure
- Dev server on Windows: use `node node_modules/next/dist/bin/next dev` (npm/npx ENOENT on this machine)
- `getOrgId()` lightweight helper in `lib/auth/get-user-org.ts` for API routes needing only org_id (avoids full getUserOrg overhead)
- API keys stored as SHA-256 hashes with `dgb_` prefix format; webhook secrets use `whsec_` prefix
- Integration Admin Panel at `/admin/integrations` for vertical SaaS client connectivity

### Pending Todos

- Save actual DraggonnB logo as public/logo.png and update src in nav.tsx + Sidebar.tsx
- Apply migration 08_ops_dashboard.sql to Supabase (when managing 5+ clients)
- Configure PayFast passphrase and production mode
- Configure Facebook/LinkedIn OAuth credentials
- Configure Resend API key for email delivery
- First end-to-end provisioning test with real client config
- N8N VPS env vars configured (APP_URL, SUPABASE_SERVICE_KEY, DEFAULT_ORG_ID, SUPABASE_URL, RESEND_API_KEY set; WhatsApp vars empty awaiting Meta credentials)
- Create `draggonnb-supabase` httpHeaderAuth credential in N8N for Billing Monitor + Analytics workflows
- Activate non-WhatsApp N8N workflows on VPS (11 workflows ready)
- Phase 08.1: Create Meta config + Embedded Signup backend (blocked by Chris providing META_APP_ID, META_APP_SECRET, META_BUSINESS_PORTFOLIO_ID)
- Phase 08.4: Token refresh + social publishing multi-tenant
- Phase 08.5: Provisioning pipeline Meta setup step
- Wire PayFast link generator to existing webhook handler
- Set up Telegram ops bot webhook + channel configuration

### Blockers/Concerns

- Actual logo PNG file needs to be saved to public/logo.png
- Facebook/LinkedIn OAuth credentials still needed
- Meta App credentials needed: META_APP_ID, META_APP_SECRET, META_BUSINESS_PORTFOLIO_ID (Chris to provide)
- PayFast passphrase still needed
- Resend API key still needed

## Session Continuity

Last session: 2026-03-15 (Session 40)
Stopped at: Phase 08 Meta integration -- planning complete (5 sub-phases), Phase 08.2 multi-tenant WhatsApp refactor coded, Phase 08.3 onboarding wizard UI built, Billing Monitor N8N workflow deployed. Build passing.
Resume with: Phase 08.1 backend (needs Meta credentials from Chris). Activate non-WhatsApp N8N workflows. Create draggonnb-supabase credential. Phase 08.4 token refresh. Phase 08.5 provisioning update.

### Session 40 Summary (2026-03-15)
**What was accomplished:**
1. Completed environment variable audit across Vercel (22 vars), VPS (7 N8N vars), and local .env.local
2. VPS env vars configured via SSH: APP_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY, DEFAULT_ORG_ID, RESEND_API_KEY set in /root/.env
3. Created comprehensive Phase 08 Meta Business API Integration scope and 5 sub-phase plans in `.planning/phases/08-meta-integration/`
4. Deployed Billing Monitor N8N workflow (15 nodes, 2 triggers) -- VPS ID: `IPJGaMPjDkaMXzkU` (17th workflow total)
5. Built Phase 08.3 Onboarding Wizard UI: 6-step wizard with Path A (Embedded Signup) and Path B (WABA sharing), POPIA/DPA agreement, module selection
6. Implemented Phase 08.2 Multi-Tenant WhatsApp Client Refactor: all WhatsApp functions now accept optional `orgId` for per-tenant credential resolution
7. Created `lib/meta/whatsapp-tenant.ts` (tenant config resolver) and `lib/meta/phone-number-map.ts` (reverse phone-to-org lookup)
8. Updated webhook handler for multi-WABA routing via `phone_number_id` metadata
9. Added Meta OAuth callback routes to middleware public API routes
10. Build verified passing (0 source errors, all 170 routes compile)

**New files:**
- `.planning/phases/08-meta-integration/08-SCOPE.md` -- Phase 08 scope with Meta account details
- `.planning/phases/08-meta-integration/08-01-PLAN.md` through `08-05-PLAN.md` -- 5 sub-phase plans
- `app/(dashboard)/onboarding/meta/page.tsx` -- 6-step Meta onboarding wizard
- `components/onboarding/MetaEmbeddedSignup.tsx` -- Embedded Signup OAuth popup component
- `components/onboarding/WABAShareGuide.tsx` -- WABA sharing guide with copy-to-clipboard
- `components/onboarding/POPIAAgreement.tsx` -- POPIA/DPA scrollable agreement
- `app/api/onboarding/meta/route.ts` -- Onboarding POST handler with Zod validation
- `app/api/meta/embedded-signup/route.ts` -- Model A OAuth initiation (placeholder)
- `app/api/meta/callback/route.ts` -- OAuth callback handler (placeholder)
- `app/api/meta/waba-shared/route.ts` -- Model B WABA sharing webhook (placeholder)
- `lib/meta/whatsapp-tenant.ts` -- Per-tenant WABA credential resolver
- `lib/meta/phone-number-map.ts` -- Phone number to org reverse lookup

**Modified files:**
- `lib/whatsapp/client.ts` -- All functions accept optional `orgId`, async `getConfig()` with tenant lookup
- `lib/whatsapp/router.ts` -- `routeMessage()` accepts and passes `orgId`
- `lib/whatsapp/intake-flow.ts` -- `handleIncomingMessage()` accepts and passes `orgId`
- `lib/accommodation/events/sender.ts` -- Passes `organization_id` to WhatsApp calls
- `app/api/webhooks/whatsapp/route.ts` -- Multi-WABA routing via `getOrgByPhoneNumberId()`
- `lib/supabase/middleware.ts` -- Added `/api/meta/callback` and `/api/meta/waba-shared` to public routes
- `.planning/ROADMAP.md` -- Added Phase 08 Meta Integration
- `.planning/STATE.md` -- Updated with session 40 summary

**What to do next session:**
1. Chris provides Meta App credentials (META_APP_ID, META_APP_SECRET, META_BUSINESS_PORTFOLIO_ID)
2. Implement Phase 08.1 backend (Meta config lib, Embedded Signup flow, real OAuth routes)
3. Activate 11 non-WhatsApp N8N workflows on VPS
4. Create `draggonnb-supabase` httpHeaderAuth credential in N8N
5. Phase 08.4: Token refresh cron + multi-tenant social publishing
6. Phase 08.5: Provisioning pipeline Meta setup step

### Session 39 Summary (2026-03-13)
**What was accomplished:**
1. Fixed `getOrgId()` admin client fallback (same RLS chicken-and-egg as ERR-014) -- committed as `a47d43b`
2. Fixed provisioning pipeline: `01-create-org.ts` replaced `users` table with `organization_users` + `user_profiles` -- committed as `29f3b6d`
3. Deployed all 13 new N8N workflows to VPS via MCP API (all inactive, awaiting env var configuration):
   - 8 accommodation cron workflows (queue processor, daily brief, check-in/checkout/deposit reminders, payment expiry, stock alert, occupancy snapshot, escalation checker, review request)
   - 2 WhatsApp workflows (booking confirmation webhook, check-in reminder cron)
   - 1 Billing Monitor (complex: 15 nodes, 2 trigger paths -- daily overdue check + monthly usage aggregation)
4. Verified 3 pre-existing workflows still on VPS (content queue, analytics, AI content gen)

**N8N Workflow VPS IDs:** tEGEh8DnKLRIBLUN, EaWttGjbjKz6bVL7, kjeOte1TvazAhrlz, wHhy1zAhaY9dNDYI, hCsbE0Re8eCjbiir, IeYm4lddhXdJDuYe, XmU489uRJQZp1KkX, EqxTZuImeMX2yvTQ, TblouQ4n0mUFViWk, 7yuIZWHNMs5PeVh2, S1953txyds0n7s0g, D0e1trYNWecYYctn, tlBJSPj02YZHjo0M

**What to do next session:**
1. Set N8N VPS environment variables: APP_URL, SUPABASE_SERVICE_KEY, DEFAULT_ORG_ID, SUPABASE_URL, RESEND_API_KEY, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN
2. Create `draggonnb-supabase` httpHeaderAuth credential in N8N (apikey header for Supabase REST API)
3. Activate workflows one-by-one after env vars confirmed
4. Visual testing of deployed UI
5. Wire PayFast link generator + Telegram ops bot (deferred from session 38)

### Session 38 Summary (2026-03-13)
**What was accomplished:**
1. Fixed CRM bug: all 6 CRM API routes queried non-existent `users` table -- replaced with `getOrgId()` helper querying `organization_users`
2. Added `getOrgId()` lightweight helper to `lib/auth/get-user-org.ts`
3. Built Integration Admin Panel (`/admin/integrations`) with API Keys and Webhooks tabs
4. Created 4 new admin API routes: `api/admin/api-keys/` (GET, POST), `api/admin/api-keys/[id]/` (PATCH, DELETE), `api/admin/webhooks/` (GET, POST), `api/admin/webhooks/[id]/` (GET, PATCH, DELETE)
5. Added Admin > Integrations entry to Sidebar + DashboardHeader breadcrumbs
6. Verified: TypeScript clean (0 source errors), UI renders correctly

**New files:**
- `app/(dashboard)/admin/integrations/page.tsx` -- Integration Admin Panel UI
- `app/api/admin/api-keys/route.ts` -- API key list + generate
- `app/api/admin/api-keys/[id]/route.ts` -- API key update + revoke
- `app/api/admin/webhooks/route.ts` -- Webhook list + create
- `app/api/admin/webhooks/[id]/route.ts` -- Webhook get + update + delete

**Modified files:**
- `lib/auth/get-user-org.ts` -- added `getOrgId()` helper
- 6 CRM API routes -- fixed `users` table references to `organization_users`
- `components/dashboard/Sidebar.tsx` -- added Admin section
- `components/dashboard/DashboardHeader.tsx` -- added integrations breadcrumb

**What to do next session:**
1. Deploy to production (Vercel)
2. Configure N8N workflows (17 planned)
3. First provisioning pipeline test with real client config
4. Wire PayFast link generator to existing webhook handler
5. Set up Telegram ops bot webhook + channel configuration

### Session 37 Summary (2026-03-13)
Committed all planning file updates + session 35 UI work as `137dba5`. Pushed 8 commits to GitHub.

### Session 36 Summary (2026-03-13)
getUserOrg auth fix (`33e0376`): rewrote to use `organization_users` junction table. Fixed RLS recursion. Comprehensive planning files audit across all .planning/*.md files. 0 source errors.

### Session 35 Summary (2026-03-10)
Built Booking Detail page and Channel Manager UI. Integrated guest portal URL into event dispatcher. Fixed provisioning API security and QA checks. 0 source errors.

### Session 34 Summary (2026-03-10)
Committed 33 files from previous session. Fixed 3 code review issues. Built Automation Hub, Stock & Inventory, Cost Tracking UI pages. 0 source errors.

### Previous Sessions
- Session 33 (2026-03-06): Complete 5-phase AI Automation & Operations Layer (15 tables, 46 routes, 7 libs, 4 agents).
- Session 31 (2026-03-05): Verified production deployment. Smoke tested booking flow.
- Session 30 (2026-03-05): Built 6 remaining accommodation APIs. 48 routes total.
- Session 29 (2026-03-05): Applied DB migrations to Supabase (39 tables). Built 30 routes + 4 pages.
- Session 28 (2026-03-05): Fixed 4 live bugs. Added 59 tests. Rotated Supabase key.
- Sessions 1-27: All 7 v1 phases + v2 BOS + architecture restructure + brand redesign.
