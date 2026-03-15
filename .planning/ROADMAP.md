# Roadmap: DraggonnB OS

## Overview

DraggonnB OS is a production-deployed multi-tenant B2B operating system for South African SMEs. The v1 roadmap (7 phases), v2 BOS (5 phases), architecture restructure, UI rebrand, and accommodation module (base + automation + management UI) are all complete. Platform has 84 DB tables, 162 API routes, 16+ UI modules, and 241 tests.

## Completed Work

### v1 Roadmap (All 7 Phases Complete)

| Phase | Title | Completed |
|-------|-------|-----------|
| 1 | Security & Auth Hardening | 2026-02-03 |
| 2 | Core Module Completion | 2026-02-04 |
| 3 | Landing Page & Public UI | 2026-02-09 |
| 4 | N8N Automation | 2026-02-09 |
| 5 | Social Media Integration | 2026-02-05 |
| 6 | Client Provisioning | 2026-02-05 |
| 7 | Testing & Hardening | 2026-02-05 |

### v2 BOS (Phases A-E Complete -- 2026-02-14)
- Phase A: CLAUDE.md hierarchy, error catalogue, module manifest
- Phase B: Provisioning steps 6-8, brand theming, manifest integration
- Phase C: Build reviewer agent, quality system
- Phase D: Ops dashboard schema (deferred until 5+ clients)
- Phase E: ClientOnboardingAgent, AI ops architecture

### Architecture Restructure (2026-02-14)
- Shared DB + RLS (replaces per-client Supabase)
- Single Vercel deployment with wildcard subdomain
- DB-backed module registry + tenant_modules
- Simplified provisioning (org row + modules)

### UI Rebrand (2026-03-01)
- All dashboard pages redesigned with Brand Crimson/Charcoal palette
- Sidebar: Lucide icons, logo branding, AI Agents section
- Landing page: dark -> light theme conversion

### Accommodation Module (2026-03-06 - 2026-03-10)
- 84 DB tables applied to Supabase (14 migration files)
- 102 API routes (56 base + 46 automation)
- 12 UI pages (properties, units, bookings, guests, rates, availability, inquiries, automation, stock, costs, channels, booking detail)
- 4 AI agents (QuoterAgent, ConciergeAgent, ReviewerAgent, PricerAgent)
- Event dispatcher + automation rules + message queue
- Guest portal with access pack system
- Channel manager (iCal feeds for OTAs)
- PayFast link generation + payment tracking
- Telegram ops bot + staff task management
- Per-unit cost tracking + stock inventory + profitability reports

### Auth Fix (2026-03-13)
- Rewrote `getUserOrg()` to use `organization_users` junction table
- Fixed RLS recursion on `organization_users` table
- Dashboard and CRM pages working again

## Current Milestone: First Client Go-Live

**Goal:** Onboard first paying client end-to-end

| Task | Status |
|------|--------|
| Save actual logo PNG to public/ | Pending |
| DB migrations applied to Supabase | Done |
| Build passing on Vercel | Done |
| Login -> dashboard flow working | Done |
| Configure PayFast production passphrase | Pending |
| Configure Resend API key | Pending |
| Configure N8N workflows (17 templates) | Pending |
| First provisioning pipeline test | Pending |
| End-to-end test: signup -> provision -> dashboard | Pending |

## Next Milestones

### Milestone: Meta Platform Integration (Phase 08)
**Goal:** Unified Meta (WhatsApp + Facebook + Instagram) integration with dual onboarding models
**Plan:** `.planning/phases/08-meta-integration/08-SCOPE.md`
**Status:** Scoped, awaiting review

| Sub-Phase | Scope | Effort | Status |
|-----------|-------|--------|--------|
| 08.1 | Meta App Registration + Embedded Signup Backend | 2-3 sessions | Not started |
| 08.2 | Multi-Tenant WhatsApp Client Refactor | 1-2 sessions | Not started |
| 08.3 | Client Onboarding Wizard UI | 2-3 sessions | Not started |
| 08.4 | Multi-Tenant Social Publishing | 1 session | Not started |
| 08.5 | Provisioning Pipeline Update | 1 session | Not started |

**Prerequisites (Chris):**
- Register Meta App at developers.facebook.com
- Submit for App Review (WhatsApp permissions)
- Get DraggonnB Business Portfolio ID
- Meta Business Verification

### Milestone: Production Credentials & Integrations
- Configure Resend API key for email delivery
- ~~Configure Facebook/Instagram OAuth (social publishing)~~ -> Covered by Phase 08
- Configure LinkedIn OAuth (social publishing)
- Switch PayFast from sandbox to production
- Self-host N8N on Hostinger VPS (Done -- env vars configured 2026-03-15)

### Milestone: First Hospitality Client
- Target: Swa-Zulu Safari Lodges (reference client)
- Configure client subdomain
- Run full provisioning pipeline
- End-to-end test: signup -> provision -> dashboard -> booking flow
- Configure N8N workflows for accommodation automation

### Milestone: Scale to 10+ Clients
- Apply ops dashboard migration (08_ops_dashboard.sql)
- Build ops dashboard UI for client management
- Automate provisioning pipeline end-to-end
- ~~WhatsApp integration via Meta Cloud API + N8N~~ -> Covered by Phase 08

---
*Last updated: 2026-03-15 -- Added Phase 08 Meta Integration scope*
