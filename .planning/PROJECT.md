# DraggonnB OS -- AI-Powered Business Operating System

## What This Is

A production-deployed multi-tenant B2B operating system targeting South African SMEs. DraggonnB OS provides CRM, email marketing, AI content generation, social media automation, accommodation management with full AI automation, AI agents, analytics, and payments -- all in one platform. All clients share a single Supabase project with RLS-based tenant isolation. Each client gets a subdomain on *.draggonnb.online with DB-backed module gating.

## Core Value

**A complete, working multi-tenant business automation platform where new clients are provisioned with a database row, a subdomain, and activated modules -- live in under an hour.** Every module works: CRM, email, content, payments, dashboard, accommodation (with AI automation, guest portal, channel manager, cost tracking), AI agents.

## Architecture

- **Multi-tenant:** Shared Supabase DB with RLS policies using `get_user_org_id()` (STABLE, cached per-query)
- **Auth model:** `organization_users` junction table links auth users to `organizations`. `user_profiles` for display info. `getUserOrg()` in `lib/auth/get-user-org.ts` is the central auth function (used by 19+ files)
- **Routing:** Wildcard DNS on `*.draggonnb.online`, middleware resolves tenant from subdomain, injects `x-tenant-id`/`x-tenant-tier`/`x-tenant-modules` headers
- **Module gating:** `module_registry` (global catalog) + `tenant_modules` (per-tenant activation) tables
- **Provisioning:** 9-step saga: create-org -> create-admin -> assign-subdomain -> seed-data -> n8n-webhooks -> deploy-automations -> onboarding-sequence -> qa-checks -> configure-billing. Rollback cascades via `DELETE FROM organizations WHERE id = ...`
- **AI ops:** N8N for deterministic automation, Claude API via BaseAgent for intelligent ops, build-time Claude Code
- **Event-driven automation:** `emitBookingEvent()` dispatcher triggers automation rules, guest messages, staff notifications, and auto-cost entries on booking status changes

## Tech Stack

- Next.js 14.2.33 App Router, TypeScript, Tailwind CSS, shadcn/ui
- Supabase (DB + Auth), Resend (email), PayFast (payments), N8N (workflows)
- Vercel (hosting), GitHub (code), Gitea (state docs)
- Recharts (charts), Lucide React (icons)

## Brand Identity

- **Primary:** Brand Crimson (HSL 348, 75%, 42%) -- buttons, active states, accents
- **Secondary:** Brand Charcoal (HSL 220) -- text, dark elements, secondary accents
- **Theme:** Light (white/gray-50 backgrounds, crimson accents)
- **Logo:** Charcoal + crimson split icon with "DRAGGONNB Operating System" text
- **Landing page:** Light theme with dark CTA section for contrast

## Platform Scale

| Metric | Count |
|--------|-------|
| DB tables (Supabase) | 84 |
| API routes | 162 |
| UI modules/pages | 16+ |
| Library modules | 21 |
| Components | 54 |
| N8N workflow templates | 17 |
| AI agents | 4 |
| Vitest tests | 241 |
| Provisioning steps | 9 |
| Supabase migrations | 14 |

## Modules

| Module | Status | Tier | Routes | Key Features |
|--------|--------|------|--------|--------------|
| CRM (contacts, companies, deals) | Complete | Core | 6 | Pipeline view, search/filter, org-scoped |
| Email Marketing (campaigns, sequences, templates) | Complete | Core | 14 | Variable substitution, tracking, batch send |
| Content Studio (AI generation) | Complete | Core | 5 | N8N-powered AI content generation |
| Social Media (scheduling, publishing) | Complete | Growth | 4 | Facebook/LinkedIn/Instagram scheduling |
| Accommodation | Complete | Growth | 102 | Properties, units, bookings, guests, rates, availability, inquiries, guest portal, channel manager, automation, payments, stock, costs, agents |
| AI Agents (Autopilot, workflows, settings) | Complete | Scale | 4 | BaseAgent pattern, session tracking |
| Analytics (dashboard stats, pipeline charts) | Complete | Core | 2 | Stat cards, Recharts pipeline chart |
| Payments (PayFast, 3 tiers) | Complete | Core | 1 | R1,500/R3,500/R7,500 tiers, ITN webhook |
| Leads (capture, scoring) | Complete | Core | 4 | Lead qualification, scoring |
| Webhooks (PayFast, N8N, Resend) | Complete | Core | 5 | ITN validation, signature verification |
| External APIs (CRM, email sequences) | Complete | Core | 5 | M2M auth, scope guards |
| Ops (health, metrics) | Complete | Core | 2 | Platform health monitoring |

### Accommodation Automation Layer (Complete)

| Phase | Scope | Key Components |
|-------|-------|----------------|
| 1: Guest Comms | Event dispatcher + message queue + multi-channel sending | `emitBookingEvent()`, automation rules, template system |
| 2: Payments | PayFast link generation + payment tracking + financial snapshots | Per-booking payment links, reconciliation |
| 3: Staff Ops | Telegram ops bot + task assignments + department channels | Real-time staff notifications |
| 4: AI Agents | 4 agents extending BaseAgent | QuoterAgent, ConciergeAgent, ReviewerAgent, PricerAgent |
| 5: Costing | Per-unit cost tracking + stock inventory + profitability reports | Auto-cost on booking events |

### Accommodation UI Pages (Complete)

- Properties list + management
- Units list + management
- Bookings list + detail view (with guest info, financial summary, status actions)
- Guests list
- Rates management
- Availability calendar
- Inquiries
- Automation Hub (rules, message queue, comms log)
- Stock & Inventory (items, movements)
- Cost Tracking & Profitability (summary, unit costs, margins)
- Channel Manager (iCal feeds for Booking.com/Airbnb/VRBO)
- Guest Portal (access pack with booking details)

## API Route Breakdown

| Category | Routes | Path Prefix |
|----------|--------|-------------|
| Accommodation (base) | 56 | /api/accommodation/* |
| Accommodation (automation) | 46 | /api/accommodation/automation/*, agents/*, payments/*, ops/* |
| Email | 14 | /api/email/* |
| CRM | 6 | /api/crm/* |
| Webhooks | 5 | /api/webhooks/* |
| External | 5 | /api/external/* |
| Content | 5 | /api/content/* |
| Auth | 5 | /api/auth/* |
| Social | 4 | /api/social/* |
| Leads | 4 | /api/leads/* |
| Autopilot | 4 | /api/autopilot/* |
| Ops | 2 | /api/ops/* |
| Guest Portal | 2 | /api/guest-portal/* |
| Embed | 2 | /api/embed/* |
| Payments | 1 | /api/payments/* |
| Provisioning | 1 | /api/provisioning/* |
| Setup | 1 | /api/setup/* |

## Infrastructure

- **Supabase project:** `psqfgzbjbgqrmjskdavs`
- **Vercel:** `draggonnb-mvp` auto-deploys from main
- **N8N:** draggonn-b.app.n8n.cloud (migrating to self-hosted on VPS)
- **VPS:** Hostinger with SSH access (`ssh hostinger-vps`)
- **Gitea:** git.draggonnb.online:3030 (state docs)
- **GitHub:** DRAGGONNB/draggonnb-platform

## Missing Credentials

- Resend API key (email delivery)
- Facebook/Instagram OAuth credentials (social publishing)
- LinkedIn OAuth credentials (social publishing)
- PayFast production passphrase (live payments)

## Completion Status

- v1 Roadmap: 7/7 phases complete
- v2 BOS: Phases A-E complete
- Architecture restructure: Shared DB + RLS migration complete
- UI Rebrand: Complete
- Accommodation module: Complete (base + automation + UI)
- Restaurant module: Complete (POS, SOPs, QR, floor plan, compliance)
- Elijah security & response module: Complete
- Meta integration (Phase 08): Partial (08.2, 08.3 done)

## Previous Milestone: v3.0 — Commercial Launch (shipped 2026-04-27)

**Phases 09-11 complete (24/24 plans).** Phase 12 partially shipped (3/10 plans: 12-01 hotfixes, 12-06 dynamic sidebar, 12-08 module-focused public landing). Remaining Phase 12 work (12-07 push, BILL-08, OPS-02..04, mobile sweep, floating helper) carries forward into v3.1 Phase 16.

Delivered: modular pricing (R599 Core + R1,199 Vertical + add-ons), brand voice capture into all 6 agents with tenant-scoped Anthropic cache, 3-day automated onboarding, Campaign Studio (email + SMS live, social credential-gated), Easy/Advanced UX pattern proven on CRM, dynamic sidebar, module-focused public landing.

## Current Milestone: v3.1 — Operational Spine

**Goal:** Federate DraggonnB OS and Trophy OS into a single ecosystem experience without rewriting Trophy OS. SSO bridge + cross-product approval spine + multi-hunter split-billing + accommodation↔hunt booking linkage + PayFast wiring for Trophy OS. Anchored on **Swazulu Game Lodge as first dual-product pilot.**

**Strategic context:** Trophy OS already exists at `C:\Dev\DraggonnB\products\trophy-os` with 24 routes, 779-line schema, 48 species seeded, full RLS. Phases 0–11/20 complete. Same Supabase project (`psqfgzbjbgqrmjskdavs`); tables prefixed `safari_*` / `tos_*` to coexist with DraggonnB CRM. Decision D3 revised: Trophy OS = federated peer product via SSO bridge (Option C), NOT absorbed as a module. One ecosystem, two codebases, shared infrastructure.

**Target capabilities (Wave A — 60 days, 4 phases):**
- **Cross-product foundation (Phase 13):** SSO bridge between DraggonnB OS and Trophy OS · `tenant_modules.config.trophy.linked_org_id` mapping · cross-product nav (DraggonnB sidebar surfaces "Trophy OS" with auto-login; reverse from Trophy OS) · shared Supabase auth tokens
- **Approval spine (Phase 14):** `approval_requests` table with `product` column (draggonnb/trophy) · per-role threshold lattice unified across both products' role enums (DraggonnB 4 roles, Trophy 9 roles) · Telegram tap-to-approve queue spans both products · generic action types: damage_charge, rate_change, content_post, quota_change, safari_status_change, supplier_job_approval
- **Damage auto-billing + Hunt bookings + Cross-product stay link (Phase 15):** Damage Telegram-flag flow in DraggonnB Accommodation (staff flag → auto-calc → guest WhatsApp charge via approval spine) · `safari_hunters` junction in Trophy OS for multi-hunter split-billing · `safaris.accommodation_booking_id` cross-references DraggonnB Accommodation booking · per-hunter PayFast charges in Trophy OS · "single billing root" for hunt+stay packages
- **PWA guest surface + Trophy PayFast + v3.0 carry-forward (Phase 16):** PWA at `stay.draggonnb.co.za/{booking-id}` (DraggonnB Accommodation per-booking experience surface) · Trophy OS PayFast subscription wiring goes live (R599 / R1,499 / R3,499 tiers) · v3.0 Phase 12 carry-forward: BILL-08 reconciliation cron, OPS-02..04 audit crons, 360px mobile sweep, push 12-07 (committed at `bedaff0e`)

**Locked decisions (D1–D8):**
- D1: Build aggressively regardless of investor — investor interested but not gating cadence
- D2: Pilot lodge = Swazulu Game Lodge (real intake drives Wave A scope)
- D3 (revised): Trophy OS = federated peer product via SSO bridge (Option C), NOT absorbed as module
- D4: Three-channel comms doctrine — Telegram (staff) · WhatsApp (clients) · PWA + per-farm web (experience)
- D5: Personal guest app = PWA at `stay.draggonnb.co.za/{booking-id}`
- D6: Swazulu activates DraggonnB Accommodation + Trophy OS modules; custom domain `swazulu.com` linked once stable
- D7: Vendor billing = subscription-as-a-service, comms allowances bounded by API costs
- D8: Architecture map → Wave A formal plan workflow (this milestone)

**Design principle:** Two-product ecosystem on shared infrastructure beats single-platform-with-modules. Federation preserves Trophy OS investment + delivers single-login UX. Investor narrative: "DraggonnB Business Automation runs DraggonnB OS (multi-tenant SaaS) + Trophy OS (vertical hunting OS) on shared infrastructure, with full cross-product integration."

**Out of scope (deliberately, for v3.1):**
- Trophy OS UI rework — stays as-is
- DraggonnB role enum expansion to 9 roles — Trophy keeps 9; DraggonnB keeps 4; mapping via SSO bridge
- Embedded Finance — still v3.2+
- Easy View rollout to remaining DraggonnB modules — still v3.2+
- Per-carcass routing pipeline, farmer photo classification, game-lodge deep-onboarding intake — Wave B (v3.2)
- GoHunting.com, location marketplaces, Go-X template — Wave C (v3.3+)

## Constraints

- **Tech stack:** Next.js 14, Supabase, TailwindCSS, TypeScript -- locked
- **Payment:** PayFast only (SA market requirement)
- **Currency:** ZAR (South African Rand)
- **Hosting:** Vercel for app, Hostinger VPS for N8N
- **Compliance:** POPI Act (SA data protection) -- RLS-based tenant isolation
- **AI:** Claude API via N8N workflows + BaseAgent for per-call ops

---
*Last updated: 2026-05-01 — milestone v3.1 Operational Spine initialized (Trophy OS Option C aligned)*
