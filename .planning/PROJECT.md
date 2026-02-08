# DraggonnB CRMM — Base SaaS Template

## What This Is

A production-ready B2B automation SaaS platform targeting South African SMEs. DraggonnB CRMM (Client Relationship & Marketing Management) is the **base template** that every new client gets — CRM, email marketing, AI content generation, social media automation, analytics, and payments — all in one platform. Each client gets an isolated deployment (separate Supabase project, GitHub repo, Vercel deployment) with client-specific customizations built on top of this base.

## Core Value

**A complete, working end-to-end business automation platform that can be cloned and deployed for a new client within 48-72 hours.** Every module must work — CRM, email, content, payments, dashboard — because this is the foundation every client deployment inherits.

## Requirements

### Validated

- ✓ Next.js 14 App Router with TypeScript — existing
- ✓ Supabase Auth (login, signup, password reset, session management) — existing
- ✓ Multi-tenant architecture with organization_id isolation — existing
- ✓ CRM module: contacts CRUD with search/filter — existing
- ✓ CRM module: deals pipeline CRUD — existing
- ✓ CRM module: companies CRUD — existing
- ✓ Email module: campaign management UI (create, list, edit) — existing
- ✓ Email module: template management UI — existing
- ✓ Email module: sequence management UI — existing
- ✓ Email module: send API with usage limits, tracking, unsubscribe — existing (scaffolded)
- ✓ PayFast integration: checkout flow with 3 tiers (R1,500/R3,500/R7,500) — existing (sandbox)
- ✓ PayFast ITN webhook with 3-step validation — existing
- ✓ Dashboard page with charts (recharts) — existing (mock data)
- ✓ Sidebar navigation and dashboard layout — existing
- ✓ shadcn/ui component library (32 components) — existing
- ✓ Middleware auth session refresh — existing
- ✓ Vercel deployment with auto-deploy from GitHub — existing
- ✓ N8N webhook client code (content gen, analytics, provisioning) — existing (scaffolded)

### Active

- [ ] Enable Supabase RLS policies (CRITICAL security blocker)
- [ ] Fix signup flow: organization_id not linked to user record
- [ ] Fix middleware to protect all dashboard routes (not just /dashboard)
- [ ] Create admin Supabase client for webhooks (PayFast, Resend) that bypass RLS
- [ ] Wire dashboard to real Supabase data (replace all mock/hardcoded values)
- [ ] Configure and test Resend email integration end-to-end
- [ ] Build proper marketing landing page
- [ ] Self-host N8N on Hostinger VPS (migrate from N8N Cloud)
- [ ] Activate N8N workflows (content generator, queue processor, analytics collector)
- [ ] Connect social media APIs (Facebook/Instagram, LinkedIn) via N8N
- [ ] Build automated client provisioning (clone repo, create Supabase project, deploy to Vercel)
- [ ] Fix campaign send to target contacts (not team users)
- [ ] Fix environment variable mismatches for N8N
- [ ] Secure email tracking (sign unsubscribe tokens, validate redirect URLs)
- [ ] Fix PayFast webhook to use service role key
- [ ] Remove hardcoded setup API secret
- [ ] Production PayFast merchant account setup
- [ ] Add test framework and critical path tests

### Out of Scope

- Mobile native apps — responsive web sufficient for MVP
- Dark mode — configured but not priority for launch
- White-label branding — Enterprise tier future feature
- Bank SMS detection — awaits SMS gateway partnership
- Voice AI agents — Phase 2+ feature
- Admin panel — manage via Supabase dashboard initially
- Advanced ML analytics — basic reporting sufficient for launch
- Multi-language support — English only for South African market
- CI/CD pipeline — manual deploys via Vercel for now

## Context

**Existing codebase:** ~55-60% complete. 24 pages, 26 API routes, 33 components deployed at https://draggonnb-mvp.vercel.app. Build passes. Core architecture is sound but has critical bugs (signup flow, middleware protection) and security gaps (no RLS).

**Business model:** R1,500-R7,500/month per client. Target: 30 clients in 6 months. First client is waiting — urgency to ship.

**Infrastructure available:**
- Supabase project: `psqfgzbjbgqrmjskdavs`
- N8N Cloud: https://draggonn-b.app.n8n.cloud (migrating to self-hosted)
- Hostinger VPS: Ready with SSH access
- Vercel: Project `draggonnb-mvp` auto-deploys from main
- API keys available: Anthropic Claude

**API keys NOT yet available:**
- Resend API key
- Social media platform credentials (Facebook, Instagram, LinkedIn)
- Production PayFast merchant credentials

**Critical bugs identified in codebase audit:**
1. Signup creates org but doesn't link user to it (organization_id null)
2. Middleware only protects /dashboard, not /crm, /email, etc.
3. PayFast webhook uses anon key (will fail when RLS enabled)
4. Campaign send targets team users instead of contacts
5. Dashboard shows hardcoded fake data

## Constraints

- **Tech stack**: Next.js 14, Supabase, TailwindCSS, TypeScript — locked, too much existing code to change
- **Payment**: PayFast only — South African market requirement, no Stripe/international
- **Currency**: ZAR (South African Rand) — all pricing in Rand
- **Hosting**: Vercel for app, Hostinger VPS for N8N self-hosted
- **Timeline**: First client waiting — ship production-ready base ASAP
- **Budget**: Minimize per-client infrastructure costs (Supabase free/hobby tier, Vercel free tier)
- **Compliance**: POPI Act (South African data protection) — per-client data isolation addresses this
- **AI**: Anthropic Claude via N8N workflows (not direct SDK integration in Next.js)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Separate Supabase project per client | Complete data isolation, simpler security, POPI compliance | ✓ Good |
| PayFast for payments (not Yoco/Stripe) | SA market standard, native ZAR, recurring subscriptions built-in | — Pending |
| Self-host N8N on Hostinger VPS | More control, no monthly N8N Cloud fee, already have VPS | — Pending |
| Next.js App Router (not Pages) | Modern patterns, Server Components, better for new development | ✓ Good |
| shadcn/ui components | Flexible, customizable, no vendor lock-in, already 32 components installed | ✓ Good |
| Claude AI via N8N (not direct SDK) | Keeps AI logic in workflows, easier to modify without code deploys | — Pending |
| Automated client provisioning | Required for 48-72hr turnaround promise, scales beyond manual | — Pending |

---
*Last updated: 2026-02-02 after initialization*
