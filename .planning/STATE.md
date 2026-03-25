# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** Complete multi-tenant B2B operating system for South African SMEs. Shared Supabase DB with RLS-based tenant isolation, wildcard subdomain routing, DB-backed module gating, automated provisioning.
**Current stats:** 168 DB tables (166 with RLS), 162 API routes, 17+ UI modules, 6 AI agents, 20 N8N workflows active, 241 tests. Build passing.

## Current Position

Phase: Launch Readiness + Post-Deploy Fixes
Plan: v1 roadmap complete (7/7 phases). BOS v2 complete. Architecture restructure complete. Accommodation base + Automation Layer + Management UI all complete. Phase 08 Meta integration planned (deferred pending credentials). Site redesign + admin panel + template system complete. PR #9 merged.
Status: DEPLOYED TO PRODUCTION. Live at https://draggonnb-platform.vercel.app
Last activity: 2026-03-25 -- Session 41: Brand redesign, admin panel, templates, module expansion, VPS config, N8N activation, agent testing
Progress: 168 DB tables + RLS live in Supabase. 162 API routes. 17+ UI modules. 6 AI agents. 20 N8N workflows active on VPS. 10 branded communication templates. 241 tests. TypeScript build passing (0 source errors).

## Accumulated Context

### Decisions

- Shared DB + RLS multi-tenant (replaces per-client Supabase isolation)
- Single Vercel deployment with wildcard subdomain routing (*.draggonnb.co.za)
- DB-backed module registry + tenant_modules for feature gating
- Hierarchical CLAUDE.md: root + 3 sub-directory build specs (agents, provisioning, API)
- Error catalogue as JSON knowledge base (.planning/errors/catalogue.json)
- No autonomous sub-agents per client until 20+ clients
- Ops dashboard tables designed but deferred until 5+ clients
- Brand identity: hybrid dark/light theme -- dark hero/nav/footer (#2D2F33), light middle sections, Burgundy #6B1420 accents (from official DraggonnB_Brand_Identity_Plan.docx)
- CSS utilities: btn-brand, gradient-text-brand updated to official brand palette
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
- Logo: 882x882 PNG integrated at public/logo.png
- PayFast merchant ID: 32705333 (updated on VPS + Vercel)
- N8N: self-hosted only (cloud reference removed), all 20 workflows active, tagged by category

### Pending Todos

- Fix CRITICAL: /billing, /admin/suite, /admin/clients accessible without auth
- Fix CRITICAL: N8N workflows 100% execution failure (RLS recursion + 401 auth)
- Fix HIGH: /api/leads/capture 500 on DB insert (schema mismatch)
- Provision tenant_modules entries (currently 0 enabled)
- Manual visual QA by Chris
- Lead capture N8N workflow (qualify form -> Supabase -> email -> Telegram)
- Domain DNS configuration (draggonnb.online verification)
- Phase 08.1: Create Meta config + Embedded Signup backend (blocked by Chris providing META_APP_ID, META_APP_SECRET, META_BUSINESS_PORTFOLIO_ID)
- Phase 08.4: Token refresh + social publishing multi-tenant
- Phase 08.5: Provisioning pipeline Meta setup step
- Wire PayFast link generator to existing webhook handler
- Set up Telegram ops bot webhook + channel configuration
- WhatsApp API: Phone Number ID and Access Token needed from Meta Business dashboard (deferred by Chris)

### Blockers/Concerns

- WhatsApp API: Phone Number ID and Access Token needed from Meta Business dashboard (deferred by Chris)
- Domain DNS: draggonnb.online pointing needs verification
- Meta App credentials needed: META_APP_ID, META_APP_SECRET, META_BUSINESS_PORTFOLIO_ID (Chris to provide)
- N8N workflow execution failures need root cause fix (RLS recursion + 401 auth)

## Infrastructure State

- **Vercel:** production READY, 21 env vars, PayFast merchant 32705333
- **VPS:** Traefik + N8N (20 workflows active, tagged) + Gitea + OpenClaw
- **Supabase:** 168 tables, 166 with RLS, 7 orgs, 10 modules in registry
- **GitHub:** DRAGGONNB/draggonnb-platform (main branch), PR #9 merged
- **N8N:** 20 workflows active, 2 test workflows deleted, tagged by category (platform, accommodation, content, whatsapp, checkmylotto)
- **VPS env:** PayFast merchant 32705333, Resend key updated, N8N Cloud ref removed

## Session Continuity

Last session: 2026-03-25 (Session 41)
Stopped at: Post-deploy testing complete. Critical auth and N8N issues identified. Brand redesign live in production.
Resume with: Fix critical auth gaps (/billing, /admin/suite, /admin/clients). Fix N8N RLS recursion + 401. Fix /api/leads/capture schema mismatch. Provision tenant_modules. Lead capture workflow. DNS config.

### Session 41 Summary (2026-03-25)
**What was done:**
1. Read and applied official Brand Identity Plan from DraggonnB_Brand_Identity_Plan.docx
2. Hybrid dark/light site redesign: dark hero/nav/footer (#2D2F33), light middle sections, Burgundy #6B1420 accents
3. CSS utilities (btn-brand, gradient-text-brand) updated to official brand palette
4. 10 branded communication templates created (email: welcome, lead-qualified, proposal, invoice; WhatsApp: welcome, booking; social: 4 platform-specific announcement templates)
5. 4 admin panel pages: /admin/clients, /admin/modules, /admin/suite, /admin/pricing with 3 API routes
6. 3 new module stubs: restaurant, events, security_ops with DB migration, middleware routing, feature gates
7. CI lint-and-build fixed (5 test files, tsc clean)
8. Logo integrated (882x882 PNG)
9. Comprehensive 123-test QA plan created
10. PR #9 merged to main, deployed to production
11. VPS: PayFast merchant ID updated to 32705333, Resend key updated, N8N Cloud ref removed (self-hosted only)
12. VPS: All 20 N8N workflows activated, 2 test workflows deleted
13. N8N workflows tagged by category (platform, accommodation, content, whatsapp, checkmylotto)
14. Vercel: PayFast env updated to 32705333
15. Agent testing run: 62 tests across public pages, APIs, security, integrations
16. Fixed expired password reset link handling (redirects to /forgot-password with message)

**Issues found by testing agents:**
- CRITICAL: /billing, /admin/suite, /admin/clients accessible without auth (to fix)
- CRITICAL: N8N workflows 100% execution failure (RLS recursion + 401 auth, to fix)
- HIGH: /api/leads/capture 500 on DB insert (schema mismatch, to fix)
- WARN: tenant_modules has 0 enabled entries (to provision)

**What to do next session:**
1. Fix all critical issues from testing (auth gaps, N8N failures, leads API)
2. Provision tenant_modules entries
3. Manual visual QA by Chris
4. Lead capture N8N workflow (qualify form -> Supabase -> email -> Telegram)
5. Domain DNS configuration

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

### Session 39 Summary (2026-03-13)
**What was accomplished:**
1. Fixed `getOrgId()` admin client fallback (same RLS chicken-and-egg as ERR-014) -- committed as `a47d43b`
2. Fixed provisioning pipeline: `01-create-org.ts` replaced `users` table with `organization_users` + `user_profiles` -- committed as `29f3b6d`
3. Deployed all 13 new N8N workflows to VPS via MCP API (all inactive, awaiting env var configuration)

### Session 38 Summary (2026-03-13)
Fixed CRM bug (6 routes queried non-existent `users` table). Added `getOrgId()` helper. Built Integration Admin Panel (`/admin/integrations`). 4 new admin API routes.

### Previous Sessions
- Session 37 (2026-03-13): Committed planning files + session 35 UI work. Pushed 8 commits to GitHub.
- Session 36 (2026-03-13): getUserOrg auth fix, RLS recursion fix, planning files audit.
- Session 35 (2026-03-10): Booking Detail page, Channel Manager UI, provisioning API security.
- Session 34 (2026-03-10): Automation Hub, Stock & Inventory, Cost Tracking UI pages.
- Session 33 (2026-03-06): Complete 5-phase AI Automation & Operations Layer.
- Sessions 1-32: All 7 v1 phases + v2 BOS + architecture restructure + brand redesign.
