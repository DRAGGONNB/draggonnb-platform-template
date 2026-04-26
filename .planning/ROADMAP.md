# Roadmap: DraggonnB OS

## Overview

DraggonnB OS is a production-deployed multi-tenant B2B operating system for South African SMEs. The v1 roadmap (7 phases), v2 BOS (5 phases), architecture restructure, UI rebrand, accommodation module, restaurant module, and Elijah security module are all complete. Platform has 217+ DB tables, 198+ API routes, 20+ UI modules, 6 AI agents, 30 N8N workflows, and 583 tests. Build passing.

## Milestones

- [x] **v1.0 Core Platform** - Phases 01-07 (shipped 2026-02-09)
- [x] **v2.0 BOS** - Phases A-E (shipped 2026-02-14)
- [x] **v2.1 Architecture Restructure + UI Rebrand** - (shipped 2026-03-01)
- [x] **v2.2 Accommodation Module** - (shipped 2026-03-10)
- [x] **v2.3 Elijah Security Module** - (shipped 2026-04-01)
- [x] **v2.4 Restaurant Module Upgrade** - (shipped 2026-04-09)
- [~] **Phase 08 Meta Integration** - (08.2 + 08.3 shipped 2026-03-15; 08.1/08.4/08.5 deferred pending META credentials)
- [~] **v3.0 Commercial Launch** - Phases 09-12 (started 2026-04-24, Phase 09 shipped 2026-04-26)

## Completed Work

<details>
<summary>v1.0 Core Platform (Phases 01-07) - SHIPPED 2026-02-09</summary>

| Phase | Title | Completed |
|-------|-------|-----------|
| 01 | Security & Auth Hardening | 2026-02-03 |
| 02 | Core Module Completion | 2026-02-04 |
| 03 | Landing Page & Public UI | 2026-02-09 |
| 04 | N8N Automation | 2026-02-09 |
| 05 | Social Media Integration | 2026-02-05 |
| 06 | Client Provisioning | 2026-02-05 |
| 07 | Testing & Hardening | 2026-02-05 |

</details>

<details>
<summary>v2.0 BOS (Phases A-E) - SHIPPED 2026-02-14</summary>

- Phase A: CLAUDE.md hierarchy, error catalogue, module manifest
- Phase B: Provisioning steps 6-8, brand theming, manifest integration
- Phase C: Build reviewer agent, quality system
- Phase D: Ops dashboard schema (deferred until 5+ clients)
- Phase E: ClientOnboardingAgent, AI ops architecture

</details>

<details>
<summary>v2.1 Architecture Restructure + UI Rebrand - SHIPPED 2026-03-01</summary>

- Shared DB + RLS (replaces per-client Supabase)
- Single Vercel deployment with wildcard subdomain
- DB-backed module registry + tenant_modules
- Simplified provisioning (org row + modules)
- Brand Crimson/Charcoal palette across dashboard + landing

</details>

<details>
<summary>v2.2 Accommodation Module - SHIPPED 2026-03-10</summary>

- 84 DB tables (14 migration files), 102 API routes, 12 UI pages
- 4 AI agents (Quoter, Concierge, Reviewer, Pricer)
- Event dispatcher + automation rules + message queue
- Guest portal, channel manager (iCal), PayFast integration
- Telegram ops bot + per-unit cost tracking + stock inventory

</details>

<details>
<summary>v2.3 Elijah Security Module - SHIPPED 2026-04-01</summary>

- 33 DB tables + 16 enums + full RLS, 23 API routes, 19 UI pages
- 4 N8N workflows (roll call, escalation, fire alert, incident intake)
- WhatsApp command router (Incident Intake deferred pending Cloud API)

</details>

<details>
<summary>v2.4 Restaurant Module Upgrade - SHIPPED 2026-04-09</summary>

- Block-based SOPs, POS, QR menus, Konva floor plan editor
- 6 management pages, 4 N8N workflows activated
- 583 tests across 34 files passing

</details>

## Current Milestone: v3.0 Commercial Launch (Phases 09-12)

**Milestone goal:** Transform feature-complete platform into revenue-ready product. Modular pricing (Core + Vertical + add-ons) replaces flat 3-tier. Every v1 AI agent becomes brand-voice aware with tenant-scoped cache keys. 3-day automated onboarding closes the sign-up-to-first-value loop. Usage caps and per-tenant cost monitoring protect unit economics. **First paying client target at Phase 10 exit.**

**Locked scope decisions (2026-04-24):**
- PayFast billing: hybrid (variable-amount recurring for base+modules, one-off ad-hoc for setup fees + overage top-ups)
- Anthropic cache isolation: `org_id` as first distinct system block; golden two-tenant CI test
- Campaign Studio: decision-gated at end of Phase 10; slips to v3.1 if scope tight
- Embedded Finance: deferred to v3.1 with accountant review gate on first 3 pilot tenants
- Existing 8 orgs: audit + migrate paying, delete test (no grandfather constraints)

### Phase 09: Foundations & Guard Rails

**Goal**: Ship billing composition + usage enforcement + all catastrophic-pitfall guards before any v3.0 AI feature or UI work begins. Zero UI impact to end users; operator + platform-admin facing only.
**Depends on**: Nothing (first phase of v3.0)
**Requirements**: BILL-02, BILL-03, BILL-04, BILL-05, BILL-06, BILL-07, USAGE-01, USAGE-02, USAGE-05, USAGE-06, USAGE-07, USAGE-08, USAGE-09, USAGE-10, USAGE-12, OPS-01, OPS-05
**Avoids pitfalls**: 1 (PRICING_TIERS mutation), 2 (PayFast desync), 3 (Anthropic cost runaway), 5 (cap race), 11 (env sprawl), 12 (migration break), 15 (feature-gate leak foundations), 22 (setup fee + recurring combo), 25 (PayFast passphrase)
**Success Criteria** (what must be TRUE):
  1. A new user can subscribe to Core + Accommodation via the composition API and the composed amount is charged correctly by PayFast sandbox, with `organizations.billing_plan_snapshot` capturing the plan composition at subscribe time
  2. A single abusive tenant cannot exceed their per-tier ZAR Anthropic ceiling (Core R150 / Growth R400 / Scale R1,500) — `guardUsage()` blocks the call BEFORE it reaches Anthropic, and 50 concurrent requests at the cap boundary show zero over-cap leakage
  3. PayFast ITN webhook correctly branches by `m_payment_id` prefix (`DRG-*` / `ADDON-*` / `TOPUP-*` / `ONEOFF-*`) and validates received amount against `billing_plan_snapshot`, not current PRICING_TIERS
  4. Startup Zod schema assertion fails boot with clear error if `PAYFAST_MODE=production` without `PAYFAST_PASSPHRASE`, and `client_usage_metrics` dual-state audit has classified every read/write (migrated or deleted, none ambiguous)
**Plans**: TBD (derived during `/gsd:plan-phase 09`)

### Phase 10: Brand Voice + Site Redesign + 3-Day Onboarding

**Goal**: Close the sign-up-to-first-paying-client loop. Ship brand voice capture into every existing AI agent, rewrite the public site with an interactive module picker, and automate the 3-day onboarding pipeline. **First paying client goes live at phase exit.**
**Depends on**: Phase 09 (billing composition must exist before pricing page calls it; cost ceilings must be live before brand voice multiplies AI calls)
**Requirements**: BILL-01, BILL-09, VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05, VOICE-06, VOICE-07, VOICE-08, USAGE-03, USAGE-04, USAGE-11, USAGE-13, ONBOARD-01, ONBOARD-02, ONBOARD-03, ONBOARD-04, ONBOARD-05, ONBOARD-06, ONBOARD-07, ONBOARD-08, ONBOARD-09, SITE-01, SITE-02, SITE-03, SITE-04, SITE-05
**Avoids pitfalls**: 4 (cache key collision — tenant-scoped keys + PII scrubber + golden test), 9 (cap UX — 3-option inline modal), 10 (provisioning saga pauses not cascade-deletes), 13 (SEO regression — 301 map + Search Console baseline), 14 (Resend deliverability — mail-tester ≥9), 16 (cache-hit miss — 4,096-token floor), 19 (voice staleness — re-run wizard), 23 (monthly reset TZ), 24 (3-day promise ambiguity)
**Success Criteria** (what must be TRUE):
  1. A new tenant signs up via the pricing page's interactive module picker, completes the brand voice capture wizard (URL ingest + 5 Qs + avoid-list), and the next Quoter / Concierge / Reviewer / Pricer / LeadQualifier / ProposalGenerator agent output visibly matches the captured voice — with non-zero `cache_read_tokens` on the second same-tenant call
  2. Two tenants with different brand voices, given identical prompts in the same session, produce different outputs (golden CI test passes) — confirming tenant-scoped cache keys work
  3. A new tenant's 3-day onboarding pipeline runs automatically: Day 0 welcome + checklist, Day 1 brand voice prompt + kickoff call link, Day 2 first-campaign guide, Day 3 "you're live" email — with `onboarding_progress` showing drift flags when a step hasn't completed
  4. The pricing page shows VAT-inclusive ZAR amounts with "incl. 15% VAT" line, mobile Lighthouse performance ≥85 at 360px breakpoint, and every renamed URL from the old site has a 301 redirect
  5. Chris (platform_admin) can open `/admin/cost-monitoring` and see cost-vs-revenue per tenant, 30-day trend, and a flag on any tenant whose AI cost exceeds 40% of MRR
**Plans**: TBD (derived during `/gsd:plan-phase 10`)

### Phase 11: Easy/Advanced CRM PoC + Campaign Studio Decision Gate

**Goal**: Validate the `<ModuleHome>` + Easy/Advanced pattern on ONE module (CRM) before replicating to the rest of the platform. At phase start, evaluate Phase 10 budget burn and decide whether Campaign Studio ships in v3.0 or slips to v3.1.
**Depends on**: Phase 10 (brand voice must exist before Campaign Studio draws value from voice-aware generation; cost monitoring must exist before rolling new AI surfaces)
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07
**Requirements (decision-gated)**: CAMP-01, CAMP-02, CAMP-03, CAMP-04, CAMP-05, CAMP-06, CAMP-07, CAMP-08 — included ONLY if Phase 09-10 closed under budget; otherwise auto-move to v3.1
**Avoids pitfalls**: 7 (Easy/Advanced desync), 8 (Campaign Studio wrong-account — if ships), 18 (Telegram flood — if Campaign Studio ships), 21 (Easy→Advanced edits lost)
**Success Criteria** (what must be TRUE):
  1. A user lands on `/dashboard/crm` (Easy view), sees 3 AI action cards (today's follow-ups, stale deals, hot leads), can approve an action in one click, and the approval writes to the same server-side source of truth that the Advanced kanban reads
  2. A user edits a contact in Easy view, switches to `/dashboard/crm/advanced`, sees the edit reflected, makes further edits, switches back — with no lost state (view-desync integration test passes)
  3. New signups default to `ui_mode='easy'`, existing users default to `advanced`, and `user_profiles.ui_mode` persists the preference across sessions
  4. [Conditional on Campaign Studio shipping]: A user enters a campaign intent ("promote Sunday brunch"), reviews 5 social posts + 1 email + 1 SMS drafted in their brand voice, approves them in one screen, and sees a publish confirmation UI with channel icon + account name + preview before any post is scheduled — with a per-tenant kill switch available
**Plans**: TBD (derived during `/gsd:plan-phase 11`, after decision gate on Campaign Studio)

### Phase 12: Launch Polish + v3.1 Handoff

**Goal**: Convert Phase 09-11 telemetry into reconciliation + audit + monitor crons. Mobile sweep across every revenue-critical page. Error catalogue pattern fixes from the first weeks of paying-client traffic. Document v3.1 trigger conditions so next-milestone scope is unambiguous.
**Depends on**: Phase 11 (launch polish requires first paying clients on platform; telemetry drives which patterns to fix)
**Requirements**: BILL-08, OPS-02, OPS-03, OPS-04
**Avoids pitfalls**: 20 (mobile-first failures — 360px sweep every revenue page), plus reactive coverage of anything Phases 09-11 missed
**Success Criteria** (what must be TRUE):
  1. Nightly billing-reconciliation cron detects any drift between local composition total and PayFast subscription amount and alerts Chris via Telegram with the affected org ID and amounts
  2. Daily feature-gate audit cron verifies every gated capability is blocked at all three layers (middleware + API route + DB RLS) and alerts on any misconfiguration
  3. Token expiry monitor cron detects any Facebook / LinkedIn OAuth token within 7 days of expiry and alerts Chris with a refresh link; `/api/ops/env-health` returns current env validation status without leaking secrets
  4. Every revenue-critical page (landing, pricing, signup, payment, dashboard home, module Easy views) renders cleanly at 360px width on a real SA-representative device, and Chris's cost-monitoring dashboard shows margin per tenant with no tenant exceeding 40% COGS ratio
**Plans**: TBD (derived during `/gsd:plan-phase 12`)

## Progress

**Execution Order:**
Phases execute in numeric order: 09 → 10 → 11 → 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 01. Security & Auth Hardening | v1.0 | 3/3 | Complete | 2026-02-03 |
| 02. Core Module Completion | v1.0 | 3/3 | Complete | 2026-02-04 |
| 03. Landing Page & Public UI | v1.0 | 2/2 | Complete | 2026-02-09 |
| 04. N8N Automation | v1.0 | 3/3 | Complete | 2026-02-09 |
| 05. Social Media Integration | v1.0 | 3/3 | Complete | 2026-02-05 |
| 06. Client Provisioning | v1.0 | 3/3 | Complete | 2026-02-05 |
| 07. Testing & Hardening | v1.0 | 2/2 | Complete | 2026-02-05 |
| 08. Meta Integration | (transitional) | 3/5 | Partial | 2026-03-15 (08.2, 08.3) |
| 09. Foundations & Guard Rails | v3.0 | 5/5 | Complete | 2026-04-26 |
| 10. Brand Voice + Site Redesign + 3-Day Onboarding | v3.0 | 0/TBD | Not started | - |
| 11. Easy/Advanced CRM PoC + Campaign Studio Decision Gate | v3.0 | 0/TBD | Not started | - |
| 12. Launch Polish + v3.1 Handoff | v3.0 | 0/TBD | Not started | - |

## Next Milestones

### Milestone: Production Credentials & Integrations (ongoing)

- Configure Facebook/Instagram OAuth (social publishing) — covered by Phase 08.1 once META_APP_ID available
- Configure LinkedIn OAuth (social publishing)
- Meta Business Verification + App Review (Phase 08.1 prerequisite)

### Milestone: v3.1 Post-Launch (trigger-based)

- **Easy View rollout to remaining 5 modules** — trigger: ModuleHome pattern stable + 5+ clients onboarded
- **Embedded Finance** (VAT201 + TOMSA + tips + SARS day-end + owner-payout) — must ship with accountant review gate on first 3 pilot tenants before claiming "SARS-ready"
- **Finance-AI add-on** (Telegram receipt OCR via Claude Haiku 4.5 vision) — trigger: 5+ clients requesting
- **Campaign Studio** (CAMP-01..08) — if slipped from v3.0 decision gate
- **Events add-on** (restaurants), **White-label add-on**, **Annual billing** (10-15% discount)
- **WhatsApp Cloud API activation** (Elijah Incident Intake + tenant messaging) — trigger: Meta credentials from Chris

---
*Last updated: 2026-04-24 — v3.0 roadmap created (Phases 09-12), 53 REQ-IDs mapped (45 unconditional + 8 CAMP conditional)*
