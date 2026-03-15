# Phase 08: Meta Platform Integration

## Goal

Integrate Meta (Facebook/Instagram/WhatsApp) as a unified partner platform across DraggonnB OS modules. Support two client onboarding models: DraggonnB-managed WABA (new clients) and client-owned WABA (existing Meta accounts). Enable WhatsApp Business API for customer communications and Facebook/Instagram Graph API for social publishing -- all per-tenant with RLS isolation.

## Strategic Context

Meta becomes DraggonnB's primary distribution partner for:
- **WhatsApp** -- direct customer communications (accommodation, CRM, support)
- **Facebook** -- social media publishing (content studio)
- **Instagram** -- social media publishing (content studio)

Single Meta App serves all three use cases. Per-tenant credentials stored in `tenant_modules.config` JSONB (existing pattern).

## Two Client Onboarding Models

### Model A: DraggonnB Creates Everything (New Clients)
- DraggonnB creates WABA under its own Meta App via Embedded Signup
- Client never touches Meta directly
- WABA belongs to DraggonnB's Business Manager (cannot be migrated)
- Full control, clean, simple

### Model B: Client Has Existing Meta Account (Link & Partner)
- Client shares their WABA with DraggonnB via Meta Business Suite
- Client enters DraggonnB's Business Portfolio ID and grants scoped permissions
- DraggonnB receives `whatsapp_business_messaging` + `whatsapp_business_management` scopes
- Client retains full ownership, can revoke at any time
- Business Integration System User token (scoped per customer)

## Existing Code Inventory

### Already Built (reusable)
| File | What It Does | Multi-tenant? |
|------|-------------|---------------|
| `lib/whatsapp/client.ts` | Send text/template/media/interactive messages via Graph API v19.0 | No -- uses global env vars |
| `lib/whatsapp/router.ts` | Route inbound messages: booking lookup -> support -> intake | Partially -- looks up org from phone |
| `lib/whatsapp/intake-flow.ts` | Lead intake for unknown numbers | Partially |
| `lib/whatsapp/types.ts` | WhatsApp webhook payload types | Yes (generic) |
| `app/api/webhooks/whatsapp/route.ts` | Webhook verification + inbound message handler with HMAC validation | No -- single WABA |
| `lib/social/facebook.ts` | Facebook OAuth, token exchange, page publishing, Instagram publishing | No -- uses global env vars |
| `lib/social/linkedin.ts` | LinkedIn OAuth + publishing | No -- uses global env vars |
| `lib/social/types.ts` | Social account types | Yes |
| `app/api/social/accounts/route.ts` | Social account CRUD | Yes (org-scoped) |
| `app/api/social/publish/facebook/route.ts` | Facebook page publishing | Partially |
| `scripts/provisioning/steps/05-n8n.ts` | Create per-client N8N workflow | Yes |
| `scripts/provisioning/steps/07-onboarding.ts` | Welcome emails + WhatsApp message | Yes (but uses global WABA) |
| `n8n/wf-whatsapp-booking-confirm.json` | N8N workflow: WhatsApp booking confirmation | Uses $env vars |
| `n8n/wf-whatsapp-reminder.json` | N8N workflow: WhatsApp check-in reminders | Uses $env vars |

### Key Gap: Multi-Tenant WhatsApp
Current code uses **global** `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` env vars. For multi-tenant, each client needs their own WABA credentials stored in `tenant_modules.config` and resolved at runtime.

## Phases

### Phase 08.1: Meta App Registration & Embedded Signup Backend
**Scope:** External Meta setup + OAuth callback infrastructure
**Effort:** Medium
**Dependencies:** Meta App Review (external, 2-5 business days)

**Tasks:**
1. Register Meta App at developers.facebook.com
   - App Type: Business
   - Products: WhatsApp, Facebook Login, Instagram Basic Display
   - Permissions: `whatsapp_business_messaging`, `whatsapp_business_management`, `pages_manage_posts`, `instagram_content_publish`
2. Create `/api/meta/embedded-signup` route
   - Initiates Meta Embedded Signup flow (Model A)
   - Generates state token linked to org_id
   - Returns Meta OAuth URL with required scopes
3. Create `/api/meta/callback` route
   - Handles OAuth redirect from Meta
   - Exchanges code for access token
   - Gets long-lived token (60 days)
   - Extracts WABA ID, phone number ID from response
   - Stores per-tenant credentials in `tenant_modules.config`
4. Create `/api/meta/waba-shared` webhook route
   - Handles Model B: client shares WABA with DraggonnB
   - Receives notification when WABA is shared
   - Stores partner access token + WABA ID in `tenant_modules.config`
5. Add Meta App env vars to Vercel + VPS
   - `META_APP_ID`, `META_APP_SECRET`, `META_BUSINESS_PORTFOLIO_ID`

**New files:**
- `app/api/meta/embedded-signup/route.ts`
- `app/api/meta/callback/route.ts`
- `app/api/meta/waba-shared/route.ts`
- `lib/meta/config.ts` (Meta App configuration helper)
- `lib/meta/embedded-signup.ts` (Embedded Signup flow logic)

**DB changes:**
- None -- uses existing `tenant_modules.config` JSONB column
- Config shape: `{ waba_id, phone_number_id, access_token, token_expires_at, business_portfolio_id, onboarding_model: 'A'|'B' }`

### Phase 08.2: Multi-Tenant WhatsApp Client Refactor
**Scope:** Make WhatsApp client resolve credentials per-tenant instead of global env vars
**Effort:** Medium
**Dependencies:** Phase 08.1

**Tasks:**
1. Create `lib/meta/whatsapp-tenant.ts`
   - `getTenantWhatsAppConfig(orgId: string)` -- fetches WABA credentials from `tenant_modules.config`
   - Falls back to global env vars for DraggonnB's own WABA (backward compatible)
   - Caches config per-request to avoid repeated DB hits
2. Refactor `lib/whatsapp/client.ts`
   - All functions accept optional `orgId` parameter
   - If `orgId` provided, resolve credentials from tenant config
   - If not, use global env vars (backward compatible)
3. Refactor `lib/whatsapp/router.ts`
   - After resolving org from phone number, use org-specific WABA credentials for responses
4. Refactor `app/api/webhooks/whatsapp/route.ts`
   - Support multiple WABAs: resolve org from `phone_number_id` in webhook metadata
   - Each inbound message includes `metadata.phone_number_id` -- map to org
5. Update N8N workflow templates
   - WhatsApp workflows need to pass `org_id` to API calls
   - API routes resolve tenant WABA credentials from org_id

**Modified files:**
- `lib/whatsapp/client.ts` -- add orgId parameter to all functions
- `lib/whatsapp/router.ts` -- use tenant-specific credentials
- `app/api/webhooks/whatsapp/route.ts` -- multi-WABA routing
- `n8n/wf-whatsapp-booking-confirm.json` -- pass org_id
- `n8n/wf-whatsapp-reminder.json` -- pass org_id

**New files:**
- `lib/meta/whatsapp-tenant.ts`

### Phase 08.3: Onboarding Wizard UI
**Scope:** Build the client onboarding wizard as a Next.js page
**Effort:** Medium
**Dependencies:** Phase 08.1 (needs Meta callback routes)

**Tasks:**
1. Create `/onboarding` page with full wizard flow
   - Step 1: Welcome -- choose Path A (Start Fresh) or Path B (Link Existing)
   - Step 2: Business Details -- SA-specific fields (CIPC reg, trading name, VAT)
   - Step 3: Module Selection -- choose from module_registry
   - Step 4: POPIA & DPA acceptance (SA compliance)
   - Step 5A: Meta Embedded Signup (Path A) -- launches OAuth popup
   - Step 5B: WABA ID entry + share guide with copy-able Portfolio ID (Path B)
   - Step 6: Verify & Activate -- summary review + provisioning trigger
2. Wire wizard to provisioning pipeline
   - On "Activate", call `/api/provisioning` with collected data
   - Include Meta credentials from OAuth callback
   - Show real-time provisioning progress
3. Build POPIA/DPA component
   - Scrollable agreement text
   - Checkbox acceptance gate
   - Store acceptance timestamp in org record
4. Style with DraggonnB brand (Brand Crimson + Charcoal palette, light theme)
   - The Claude Chat artifact provides the dark-theme reference design
   - Adapt to DraggonnB's light theme identity

**New files:**
- `app/(public)/onboarding/page.tsx` -- Main wizard page
- `components/onboarding/WizardSteps.tsx` -- Step components
- `components/onboarding/MetaSignup.tsx` -- Embedded Signup launcher
- `components/onboarding/POPIAAgreement.tsx` -- POPIA/DPA acceptance
- `components/onboarding/ModuleSelector.tsx` -- Module picker

### Phase 08.4: Multi-Tenant Social Publishing
**Scope:** Make Facebook/Instagram publishing use per-tenant OAuth tokens
**Effort:** Low-Medium
**Dependencies:** Phase 08.1

**Tasks:**
1. Refactor `lib/social/facebook.ts`
   - Add `orgId` parameter to publishing functions
   - Resolve Facebook Page token from `social_accounts` table (already stores per-account tokens)
   - Token refresh: check expiry, auto-refresh long-lived tokens
2. Create `/api/meta/token-refresh` cron route
   - Daily check for tokens expiring within 7 days
   - Auto-refresh long-lived tokens (60-day cycle)
   - Alert admin if refresh fails
3. Wire Instagram publishing through same Meta App
   - Instagram Business Account linked to Facebook Page
   - Use Page token for IG publishing (existing code supports this)
4. Add social account connection to onboarding wizard
   - Optional step: "Connect your Facebook Page" after WABA setup
   - Uses same Meta OAuth flow with additional page scopes

**Modified files:**
- `lib/social/facebook.ts` -- per-tenant token resolution
- `app/api/social/publish/facebook/route.ts` -- use tenant tokens
- `app/api/social/accounts/route.ts` -- Meta OAuth account linking

**New files:**
- `app/api/meta/token-refresh/route.ts` -- Token refresh cron

### Phase 08.5: Provisioning Pipeline Update
**Scope:** Fork provisioning at step 5 based on onboarding model
**Effort:** Low
**Dependencies:** Phase 08.1, 08.2

**Tasks:**
1. Update `scripts/provisioning/steps/05-n8n.ts`
   - After creating N8N workflow, configure WhatsApp webhook URL for the tenant's WABA
   - Register webhook with Meta Graph API: `POST /{waba_id}/subscribed_apps`
2. Create `scripts/provisioning/steps/05b-meta-setup.ts`
   - If Model A: register phone number, set webhook URL
   - If Model B: verify partner access, confirm WABA sharing status
   - Store Meta config in `tenant_modules.config`
3. Update `scripts/provisioning/steps/07-onboarding.ts`
   - Use tenant-specific WABA for WhatsApp welcome message
   - Fall back to global WABA if tenant has no WhatsApp configured

**New files:**
- `scripts/provisioning/steps/05b-meta-setup.ts`

**Modified files:**
- `scripts/provisioning/steps/05-n8n.ts`
- `scripts/provisioning/steps/07-onboarding.ts`

## Implementation Sequence

```
Phase 08.1 (Meta App + Backend)     ──┐
                                      ├── Phase 08.2 (Multi-Tenant WA Client)
Phase 08.3 (Onboarding Wizard UI)  ──┤
                                      ├── Phase 08.5 (Provisioning Update)
Phase 08.4 (Social Publishing)     ──┘
```

08.1 is the foundation -- everything else depends on it.
08.3 can start in parallel with 08.2 (UI doesn't need backend refactor).
08.4 is independent but benefits from 08.1's Meta App setup.
08.5 is the final integration glue.

## Prerequisites (External / Manual)

| Item | Owner | Status |
|------|-------|--------|
| Register Meta App at developers.facebook.com | Chris | Pending -- Chris will provide credentials |
| Submit for App Review (WhatsApp permissions) | Chris | Pending |
| Get DraggonnB Business Portfolio ID from Meta Business Suite | Chris | Pending (page exists) |
| Configure Meta App webhook URL to `https://draggonnb-platform.vercel.app/api/webhooks/whatsapp` | Chris/CC | After app approval |
| Meta Business Verification | Chris | Done (verification successful) |

## Meta Account Details (Confirmed 2026-03-15)

- **Business Portfolio:** DraggonnB Business Automation
- **Facebook Page ID:** `803720826168040`
- **Contact:** Chris Terblanche
- **Phone:** 083 384 5913 (Verification ID: `531093220`)
- **Business Verification:** Successful
- **Meta App:** Pending -- Chris to register at developers.facebook.com

## Env Vars Needed

| Variable | Where | Value | Status |
|----------|-------|-------|--------|
| `META_APP_ID` | Vercel + VPS | From Meta App dashboard | Awaiting Chris |
| `META_APP_SECRET` | Vercel + VPS | From Meta App dashboard | Awaiting Chris |
| `META_BUSINESS_PORTFOLIO_ID` | Vercel + code | From Meta Business Suite | Awaiting Chris |
| `FACEBOOK_APP_ID` | Vercel | Same as META_APP_ID | Awaiting Chris |
| `FACEBOOK_APP_SECRET` | Vercel | Same as META_APP_SECRET | Awaiting Chris |

## Current Environment Status (Audited 2026-03-15)

### Vercel (22 env vars set -- all populated)
Core platform vars (Supabase, N8N, PayFast, Resend, WhatsApp, Telegram) all present.

### N8N VPS (/root/.env -> docker-compose)
- `APP_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `DEFAULT_ORG_ID`, `RESEND_API_KEY` -- all set
- `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` -- empty (awaiting Meta credentials)

### Local .env.local
- Core vars set. WhatsApp and PayFast credentials empty (WhatsApp awaiting Meta, PayFast in sandbox).

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Meta App Review rejection | Blocks all WhatsApp features | Apply early, use sandbox for dev |
| Meta Business Verification delays | Blocks production access | Start verification process immediately |
| Token expiry (60-day long-lived tokens) | Clients lose WhatsApp access | Auto-refresh cron (Phase 08.4) |
| Rate limiting on Graph API | Message delivery delays | Queue messages via existing N8N message queue |
| WABA migration not possible | Model A clients locked to DraggonnB | Documented in onboarding, client accepts |

## Success Criteria

- [ ] Meta App approved with WhatsApp + Facebook Login permissions
- [ ] Model A: New client completes Embedded Signup and sends first WhatsApp message
- [ ] Model B: Existing WABA client shares access, DraggonnB sends message on their behalf
- [ ] Onboarding wizard completes full provisioning flow
- [ ] Multi-tenant WhatsApp: two different orgs send messages from their own WABAs
- [ ] Facebook/Instagram publishing works with per-tenant tokens
- [ ] Token auto-refresh prevents expiry interruptions
- [ ] POPIA/DPA acceptance recorded per-org

## Estimated Effort

| Phase | Effort | New Files | Modified Files |
|-------|--------|-----------|----------------|
| 08.1: Meta App + Backend | 2-3 sessions | 5 | 0 |
| 08.2: Multi-Tenant WA Client | 1-2 sessions | 1 | 5 |
| 08.3: Onboarding Wizard UI | 2-3 sessions | 5 | 0 |
| 08.4: Social Publishing | 1 session | 1 | 3 |
| 08.5: Provisioning Update | 1 session | 1 | 2 |
| **Total** | **7-10 sessions** | **13** | **10** |

## Notes

- The Claude Chat onboarding wizard artifact (dark theme) serves as the UX reference. CC will adapt to DraggonnB's light theme with Brand Crimson/Charcoal palette.
- The `DRAGGONNB_PORTFOLIO_ID` in the wizard artifact is a placeholder (`112847293847561`). Replace with real ID from Meta Business Suite.
- WhatsApp template messages require pre-approval from Meta. Plan template submissions as part of Phase 08.1.
- Graph API version: currently using v19.0. Check for updates before implementation.
