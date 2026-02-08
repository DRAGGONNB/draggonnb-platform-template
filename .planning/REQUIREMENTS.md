# Requirements — DraggonnB CRMM v1

## v1 Requirements

### Security & Infrastructure

- [ ] **SEC-01**: Supabase RLS policies enabled on all tables — users can only read/write data belonging to their organization
- [ ] **SEC-02**: Signup flow links user record to organization via `organization_id` — all org-scoped queries work for new users
- [ ] **SEC-03**: Auth middleware protects all dashboard routes (`/crm`, `/email`, `/content-generator`, `/dashboard`) — unauthenticated users redirected to `/login`
- [ ] **SEC-04**: Admin Supabase client using service role key exists for webhook handlers (PayFast ITN, Resend webhooks) that need to write data without user context
- [ ] **SEC-05**: Setup API has no hardcoded default secret — fails if `SETUP_SECRET` env var not set
- [ ] **SEC-06**: Email unsubscribe tokens signed with HMAC — cannot be forged
- [ ] **SEC-07**: Email click tracking validates redirect URLs — rejects non-http(s) schemes to prevent open redirect
- [ ] **SEC-08**: PayFast passphrase required when `PAYFAST_MODE=production` — logs warning if missing
- [ ] **SEC-09**: Environment variable names aligned between `.env.example` and codebase — no silent failures from mismatched var names

### Authentication

- ✓ **AUTH-01**: User can create account with email and password — existing
- ✓ **AUTH-02**: User can log in and stay logged in across sessions via cookie — existing
- ✓ **AUTH-03**: User can request password reset via email — existing
- ✓ **AUTH-04**: User can reset password with email link — existing
- ✓ **AUTH-05**: Auth session refreshed automatically on every request via middleware — existing
- ✓ **AUTH-06**: OAuth callback handler for social login — existing (scaffolded)

### CRM Module

- ✓ **CRM-01**: User can create, view, edit, and delete contacts with search/filter — existing
- ✓ **CRM-02**: User can create, view, edit, and delete companies — existing
- ✓ **CRM-03**: User can create, view, edit, and delete deals with pipeline view — existing
- ✓ **CRM-04**: All CRM data scoped by organization_id — existing

### Email Module

- ✓ **EMAIL-01**: User can create and manage email templates with variable substitution — existing
- ✓ **EMAIL-02**: User can create and manage email campaigns — existing
- ✓ **EMAIL-03**: User can create and manage email sequences with steps — existing
- ✓ **EMAIL-04**: Email tracking (opens via pixel, clicks via link wrapping) — existing (scaffolded)
- ✓ **EMAIL-05**: Per-tier email usage limits enforced (starter: 1000/mo, pro: 10000/mo, enterprise: unlimited) — existing
- [ ] **EMAIL-06**: Resend API configured and emails actually send — code exists, needs API key and testing
- [ ] **EMAIL-07**: Campaign send targets contacts (not team users) — fix recipient query
- [ ] **EMAIL-08**: Campaign send uses Resend batch API — prevents timeout on large campaigns
- [ ] **EMAIL-09**: Email outreach rules functional end-to-end — scaffolded, needs wiring

### Payments

- ✓ **PAY-01**: Pricing page displays 3 tiers (Starter R1,500, Pro R3,500, Enterprise R7,500) — existing
- ✓ **PAY-02**: Checkout flow submits PayFast subscription form — existing (sandbox)
- ✓ **PAY-03**: PayFast ITN webhook validates signature, verifies with server, checks amount — existing
- ✓ **PAY-04**: Successful payment updates organization subscription status and logs transaction — existing
- [ ] **PAY-05**: PayFast webhook uses admin Supabase client — won't break when RLS enabled

### Dashboard & Analytics

- ✓ **DASH-01**: Dashboard page with stat cards and charts — existing (mock data)
- ✓ **DASH-02**: Sidebar navigation with all module links — existing
- [ ] **DASH-03**: Dashboard displays real data from Supabase — replace hardcoded values with actual queries
- [ ] **DASH-04**: Dashboard queries run in parallel via `Promise.all()` — reduce load time
- [ ] **DASH-05**: Dashboard components show empty states when no data — replace fake users/posts with "No data yet"

### Landing Page & Public UI

- ✓ **LP-01**: Pricing page with 3 tiers and checkout buttons — existing
- [ ] **LP-02**: Marketing landing page with value proposition, features section, social proof, and CTA
- [ ] **LP-03**: Payment success page shows clear next steps — existing but could improve

### N8N Automation

- [ ] **N8N-01**: N8N workflows activated with Supabase credentials and Anthropic API key
- [ ] **N8N-02**: Content generation API calls N8N webhook and returns generated content
- [ ] **N8N-03**: Content queue processor publishes scheduled posts
- [ ] **N8N-04**: Analytics collector runs daily and stores snapshots

### Social Media

- [ ] **SOCIAL-01**: Facebook/Instagram Graph API connected — can publish posts
- [ ] **SOCIAL-02**: LinkedIn API connected — can publish posts
- [ ] **SOCIAL-03**: Social account management UI — connect/disconnect accounts

### Client Provisioning

- [ ] **PROV-01**: Automated Supabase project creation for new client
- [ ] **PROV-02**: Database schema cloned from template to new client project
- [ ] **PROV-03**: GitHub repo cloned from template for new client
- [ ] **PROV-04**: Vercel deployment created and configured for new client
- [ ] **PROV-05**: N8N webhooks configured for new client organization

### Testing

- [ ] **TEST-01**: PayFast signature validation has unit tests with known test vectors
- [ ] **TEST-02**: Signup flow has integration test verifying user-org linkage
- [ ] **TEST-03**: CRM API routes have basic CRUD tests
- [ ] **TEST-04**: Auth middleware has tests for protected/unprotected route behavior

---

## v2 Requirements (Deferred)

- Dark mode UI
- White-label branding for Enterprise tier
- Bank SMS detection (awaits SMS gateway)
- Voice AI agents
- Admin panel (manage via Supabase dashboard for now)
- Advanced ML-driven analytics
- Mobile native apps (responsive web sufficient)
- Multi-language support (English only for SA market)
- CI/CD pipeline (manual Vercel deploys for now)
- WhatsApp Business integration
- SEO optimization module
- Error tracking (Sentry or similar)
- Database migration versioning
- Rate limiting on public endpoints

---

## Out of Scope

- Stripe/international payments — PayFast is SA market requirement
- Direct Claude SDK in Next.js — AI calls go through N8N workflows
- Custom domains per client — Vercel subdomains sufficient for v1
- Multi-currency — ZAR only
- Self-hosted Supabase — using Supabase Cloud

---

## Traceability

*Updated by roadmapper — maps each requirement to a phase*

| REQ ID | Phase | Status |
|--------|-------|--------|
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 1 | Pending |
| SEC-04 | Phase 1 | Pending |
| SEC-05 | Phase 1 | Pending |
| SEC-06 | Phase 1 | Pending |
| SEC-07 | Phase 1 | Pending |
| SEC-08 | Phase 1 | Pending |
| SEC-09 | Phase 1 | Pending |
| AUTH-01 | Phase 1 | Validated |
| AUTH-02 | Phase 1 | Validated |
| AUTH-03 | Phase 1 | Validated |
| AUTH-04 | Phase 1 | Validated |
| AUTH-05 | Phase 1 | Validated |
| AUTH-06 | Phase 1 | Validated |
| CRM-01 | Phase 2 | Validated |
| CRM-02 | Phase 2 | Validated |
| CRM-03 | Phase 2 | Validated |
| CRM-04 | Phase 2 | Validated |
| EMAIL-01 | Phase 2 | Validated |
| EMAIL-02 | Phase 2 | Validated |
| EMAIL-03 | Phase 2 | Validated |
| EMAIL-04 | Phase 2 | Validated |
| EMAIL-05 | Phase 2 | Validated |
| EMAIL-06 | Phase 2 | Pending |
| EMAIL-07 | Phase 2 | Pending |
| EMAIL-08 | Phase 2 | Pending |
| EMAIL-09 | Phase 2 | Pending |
| PAY-01 | Phase 2 | Validated |
| PAY-02 | Phase 2 | Validated |
| PAY-03 | Phase 2 | Validated |
| PAY-04 | Phase 2 | Validated |
| PAY-05 | Phase 2 | Pending |
| DASH-01 | Phase 2 | Validated |
| DASH-02 | Phase 2 | Validated |
| DASH-03 | Phase 2 | Pending |
| DASH-04 | Phase 2 | Pending |
| DASH-05 | Phase 2 | Pending |
| LP-01 | Phase 3 | Validated |
| LP-02 | Phase 3 | Pending |
| LP-03 | Phase 3 | Pending |
| N8N-01 | Phase 4 | Pending |
| N8N-02 | Phase 4 | Pending |
| N8N-03 | Phase 4 | Pending |
| N8N-04 | Phase 4 | Pending |
| SOCIAL-01 | Phase 5 | Pending |
| SOCIAL-02 | Phase 5 | Pending |
| SOCIAL-03 | Phase 5 | Pending |
| PROV-01 | Phase 6 | Pending |
| PROV-02 | Phase 6 | Pending |
| PROV-03 | Phase 6 | Pending |
| PROV-04 | Phase 6 | Pending |
| PROV-05 | Phase 6 | Pending |
| TEST-01 | Phase 7 | Pending |
| TEST-02 | Phase 7 | Pending |
| TEST-03 | Phase 7 | Pending |
| TEST-04 | Phase 7 | Pending |

---
*Last updated: 2026-02-02 after roadmap creation*
