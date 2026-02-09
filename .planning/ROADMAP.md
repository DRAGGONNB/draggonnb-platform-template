# Roadmap: DraggonnB CRMM v1

## Overview

DraggonnB CRMM is a ~60% complete B2B automation SaaS targeting South African SMEs. The existing codebase has working auth, CRM, email UI, PayFast sandbox payments, and a deployed Vercel app. This roadmap takes it from "demo that mostly works" to "production-ready base template" by fixing critical security gaps first, then wiring up real data and integrations, and finally building the automation and provisioning layers that enable the 48-72 hour client deployment promise.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Security & Auth Hardening** - Fix every security gap so the app is safe for real users
- [x] **Phase 2: Core Module Completion** - Wire dashboard, email, and payments to real data
- [x] **Phase 3: Landing Page & Public UI** - Build a marketing page that converts visitors to signups
- [x] **Phase 4: N8N Automation** - Activate AI content generation and analytics workflows
- [x] **Phase 5: Social Media Integration** - Connect Facebook/Instagram and LinkedIn for publishing
- [x] **Phase 6: Client Provisioning** - Automate new client deployment (repo, database, hosting)
- [x] **Phase 7: Testing & Hardening** - Add automated tests for critical paths

## Phase Details

### Phase 1: Security & Auth Hardening
**Goal**: Every authenticated route is protected, every database table has RLS, and no security shortcuts remain in the codebase
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. A new user can sign up, and their account is linked to an organization -- all org-scoped queries return data for that user
  2. Visiting /crm, /email, or any dashboard route without being logged in redirects to /login
  3. A Supabase query using the anon key cannot read or write another organization's data (RLS enforced)
  4. PayFast ITN webhook successfully writes to the database when RLS is enabled (uses service role key)
  5. No hardcoded secrets exist in the codebase -- setup API fails if SETUP_SECRET env var is missing
**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md -- RLS policies and admin Supabase client for webhooks
- [x] 01-02-PLAN.md -- Signup flow RLS compatibility and middleware route protection
- [x] 01-03-PLAN.md -- Email security (HMAC tokens, URL validation) and env var alignment

### Phase 2: Core Module Completion
**Goal**: Dashboard shows real data, email campaigns actually send to contacts, and payments work end-to-end
**Depends on**: Phase 1
**Requirements**: EMAIL-06, EMAIL-07, EMAIL-08, EMAIL-09, PAY-05, DASH-03, DASH-04, DASH-05, CRM-01, CRM-02, CRM-03, CRM-04, EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04, EMAIL-05, PAY-01, PAY-02, PAY-03, PAY-04, DASH-01, DASH-02
**Success Criteria** (what must be TRUE):
  1. Dashboard loads with real contact counts, deal values, and email stats from Supabase -- zero hardcoded fake data visible
  2. User can create an email campaign and send it to CRM contacts (not team users) -- emails arrive via Resend
  3. Email campaign sends do not timeout for 100+ recipients (batch API used)
  4. PayFast webhook updates subscription status successfully with RLS enabled
  5. Empty-state messages appear when an organization has no data yet (no fake users like "Sarah" or "Mike")
**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md -- Dashboard real data with parallel queries and empty states
- [x] 02-02-PLAN.md -- Email campaign targeting contacts with batch API
- [x] 02-03-PLAN.md -- Verification checkpoint for dashboard and email

### Phase 3: Landing Page & Public UI
**Goal**: Visitors see a professional marketing page that explains the product and drives signups
**Depends on**: Phase 1
**Requirements**: LP-01, LP-02, LP-03
**Success Criteria** (what must be TRUE):
  1. The root URL (/) displays a marketing landing page with value proposition, feature highlights, social proof section, and a call-to-action button
  2. Payment success page shows clear next steps (what happens after paying, when to expect access)
  3. Pricing page links to signup flow seamlessly
**Plans:** 2 plans

Plans:
- [x] 03-01-PLAN.md -- Marketing landing page (built in Session 12)
- [x] 03-02-PLAN.md -- Payment success page improvements (tier display, progress indicator) -- Already complete in prior session

### Phase 4: N8N Automation
**Goal**: AI content generation, content queue processing, and analytics collection all work end-to-end through N8N workflows
**Depends on**: Phase 1
**Requirements**: N8N-01, N8N-02, N8N-03, N8N-04
**Success Criteria** (what must be TRUE):
  1. User can generate social media content from the content generator page and see AI-written posts returned
  2. Scheduled content in the queue publishes automatically (queue processor runs on cron)
  3. Analytics snapshots are collected daily and visible on the dashboard
  4. N8N environment variables are correctly configured and documented in .env.example
**Plans:** 3 plans

Plans:
- [x] 04-01-PLAN.md -- N8N credential configuration and webhook verification (Session 21)
- [x] 04-02-PLAN.md -- Content generation and queue API wiring (Session 21)
- [x] 04-03-PLAN.md -- Analytics display on dashboard (already wired in prior sessions)

### Phase 5: Social Media Integration
**Goal**: Users can connect their social media accounts and publish posts to Facebook/Instagram and LinkedIn
**Depends on**: Phase 4
**Requirements**: SOCIAL-01, SOCIAL-02, SOCIAL-03
**Success Criteria** (what must be TRUE):
  1. User can connect a Facebook/Instagram account through the app and publish a post that appears on the platform
  2. User can connect a LinkedIn account and publish a post that appears on LinkedIn
  3. Social account management UI allows connecting and disconnecting accounts
**Plans:** 3 plans

Plans:
- [x] 05-01-PLAN.md -- Social accounts management foundation (migration, API, UI)
- [x] 05-02-PLAN.md -- Facebook/Instagram OAuth and Graph API publishing
- [x] 05-03-PLAN.md -- LinkedIn OAuth and API publishing

### Phase 6: Client Provisioning
**Goal**: A new paying client can be deployed with their own isolated infrastructure in under an hour through automation
**Depends on**: Phase 1, Phase 4
**Requirements**: PROV-01, PROV-02, PROV-03, PROV-04, PROV-05
**Success Criteria** (what must be TRUE):
  1. Running the provisioning workflow creates a new Supabase project with the full schema deployed
  2. A new GitHub repo is created from the template with client-specific configuration
  3. A Vercel deployment is created and accessible at a client-specific URL
  4. N8N webhooks are configured for the new client organization
**Plans:** 3 plans

Plans:
- [x] 06-01-PLAN.md -- Supabase project creation and database schema provisioning with RLS
- [x] 06-02-PLAN.md -- GitHub repo from template and Vercel deployment automation
- [x] 06-03-PLAN.md -- N8N webhook configuration and orchestrator with saga rollback

### Phase 7: Testing & Hardening
**Goal**: Critical paths have automated tests so changes do not silently break payments, auth, or CRM
**Depends on**: Phase 1, Phase 2
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04
**Success Criteria** (what must be TRUE):
  1. PayFast signature validation passes unit tests with known test vectors -- a bad signature is rejected, a good signature passes
  2. Signup flow integration test verifies that a new user has a linked organization_id
  3. CRM contact CRUD operations pass basic API tests (create, read, update, delete)
  4. Auth middleware test confirms unauthenticated requests to protected routes return redirect or 401
**Plans:** 2 plans

Plans:
- [x] 07-01-PLAN.md -- Test framework setup (Vitest) and PayFast signature unit tests
- [x] 07-02-PLAN.md -- Auth middleware tests and CRM contacts API integration tests

## Progress

**Execution Order:**
Phases execute in numeric order. Phases 3 and 4 can run in parallel (both depend only on Phase 1).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security & Auth Hardening | 3/3 | Complete | 2026-02-03 |
| 2. Core Module Completion | 3/3 | Complete | 2026-02-04 |
| 3. Landing Page & Public UI | 2/2 | Complete | 2026-02-09 |
| 4. N8N Automation | 3/3 | Complete | 2026-02-09 |
| 5. Social Media Integration | 3/3 | Complete | 2026-02-05 |
| 6. Client Provisioning | 3/3 | Complete | 2026-02-05 |
| 7. Testing & Hardening | 2/2 | Complete | 2026-02-05 |
