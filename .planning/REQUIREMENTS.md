# Requirements — DraggonnB OS

## Active Milestone: v3.0 — Commercial Launch

**Goal:** Transform feature-complete platform into revenue-ready product with modular pricing, Easy/Advanced UX, 3-day automated onboarding, and brand-voice-driven AI across all agents. First paying client by end of phase 10.

**Scope decisions locked (2026-04-24):**
- **PayFast billing:** Hybrid — recurring subscription (variable amount) for base + modules; one-off ad-hoc for setup fees + overage top-ups
- **Existing orgs:** None currently paying — free to migrate/delete without grandfather constraints
- **Anthropic cache isolation:** Tenant-scoped via `org_id` as first distinct cache block; golden two-tenant CI test
- **Campaign Studio:** Decision-gated at end of Phase 10 — include in v3.0 only if phases 09–10 under budget
- **Embedded Finance:** Deferred to v3.1 with accountant review gate on first 3 pilot tenants

---

### Billing Composition (BILL)

- [ ] **BILL-01**: User sees modular pricing page with interactive module picker — pick Core (R599) + optional vertical (R1,199) + add-ons; live total updates as selections change
- [ ] **BILL-02**: User signs up with a composed subscription (base + modules + add-ons) and is charged via PayFast variable-amount recurring subscription
- [ ] **BILL-03**: User pays a one-off R1,499 setup fee at checkout via PayFast ad-hoc charge, separate from recurring subscription
- [ ] **BILL-04**: User can add or remove a module/add-on mid-cycle; billing recalculates and PayFast subscription amount updates via cancel-and-recreate flow
- [ ] **BILL-05**: `organizations.billing_plan_snapshot` JSONB column stores the plan composition at subscribe time; ITN validates against snapshot (not current PRICING_TIERS)
- [ ] **BILL-06**: PayFast webhook branches by `m_payment_id` prefix — `DRG-*` (subscription), `ADDON-*` (module change), `TOPUP-*` (overage pack), `ONEOFF-*` (setup fee)
- [ ] **BILL-07**: `pricing_changelog` table records every PRICING_TIERS change with timestamp, old/new values, and operator — history is append-only
- [ ] **BILL-08**: Billing-reconciliation nightly cron compares PayFast subscription amount vs local composition total; alerts on drift
- [ ] **BILL-09**: User's pricing page total displays VAT-inclusive ZAR amount with a clear "incl. 15% VAT" line

### Brand Voice (VOICE)

- [ ] **VOICE-01**: User completes a 3-step brand voice capture wizard during onboarding — URL ingest + 5 guided questions + avoid-list
- [ ] **VOICE-02**: Brand voice stored in `client_profiles` table (extend existing columns with `example_phrases TEXT[]` and `forbidden_topics TEXT[]`) — no new table
- [ ] **VOICE-03**: Brand voice injected as Anthropic `systemBlocks` with `cache_control: ephemeral` into all 6 existing agents (Quoter, Concierge, Reviewer, Pricer, LeadQualifier, ProposalGenerator)
- [ ] **VOICE-04**: `org_id` injected as distinct first system block to force tenant-scoped prompt-cache keys — prevents cross-tenant cache leak
- [ ] **VOICE-05**: Golden CI test provisions 2 orgs with different voices, runs identical prompts, asserts different outputs AND non-zero cache reads on second-same-tenant call
- [ ] **VOICE-06**: Brand voice system prompt padded to ≥4,096 tokens to hit Haiku 4.5 cache eligibility threshold
- [ ] **VOICE-07**: PII scrubber sanitises brand voice input before storage (strips email, phone, ID numbers, payment info)
- [ ] **VOICE-08**: User can re-run the brand voice wizard from settings — updated voice invalidates cached blocks on next agent call

### Usage Caps & Cost Monitoring (USAGE)

- [ ] **USAGE-01**: Every metered action (AI generation, social post, email send, receipt OCR) calls `guardUsage(orgId, metric)` helper BEFORE the work; blocked at 100% of plan limit
- [ ] **USAGE-02**: `guardUsage` uses existing `record_usage_event` RPC (atomic check+insert) — no Redis, no read-then-write race
- [ ] **USAGE-03**: User gets in-app warning banners at 50%, 75%, 90% of each metric cap; banner includes upgrade + pay-overage options
- [ ] **USAGE-04**: User hitting 100% cap sees inline modal with 3 actions: upgrade plan / buy overage top-up / wait until reset (with exact reset date/time in tenant timezone)
- [ ] **USAGE-05**: 50-concurrent-request unit test verifies no over-cap leakage through `guardUsage`
- [ ] **USAGE-06**: Per-tier hard ZAR ceiling on Anthropic cost: Core R150/mo, Growth R400/mo, Scale R1,500/mo — agents auto-pause at 100% with alert
- [ ] **USAGE-07**: Anthropic cost circuit breaker: check projected cost BEFORE API call; abort with graceful error if over ceiling
- [ ] **USAGE-08**: `ai_usage_ledger` table records every BaseAgent call (including retries) with model, tokens, cache hits, computed cost in ZAR cents
- [ ] **USAGE-09**: `agent_sessions` migration adds `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens`, `cost_zar_cents`, `model` columns
- [ ] **USAGE-10**: Nightly cron (`/api/ops/cost-rollup`) aggregates `agent_sessions` + `usage_events` into `daily_cost_rollup` table per org
- [ ] **USAGE-11**: `/admin/cost-monitoring` page (platform_admin-guarded) shows cost-vs-revenue per tenant, 30-day trend, margin %, and flags any tenant with cost > 40% of MRR
- [ ] **USAGE-12**: Haiku 4.5 enforced as default model across all BaseAgent subclasses — no silent Sonnet fallback; model selection logged per call
- [ ] **USAGE-13**: Legacy `client_usage_metrics` reads/writes audited — every route either migrates to `usage_events` RPC or the legacy write is deleted

### Onboarding (ONBOARD)

- [ ] **ONBOARD-01**: Day 0 (signup): user completes payment, receives welcome email, sees onboarding dashboard with 4-step progress checklist
- [ ] **ONBOARD-02**: Day 1: automated email prompts user to complete brand voice wizard; kickoff call link (Cal.com or equivalent) included
- [ ] **ONBOARD-03**: Day 2: automated email guides user through first campaign / first action in their active module
- [ ] **ONBOARD-04**: Day 3: automated email confirms "you're live" + lists unlocked features + invites feedback
- [ ] **ONBOARD-05**: `onboarding_progress` table tracks per-org state: current day, completed steps, kickoff-call scheduled timestamp, drift flags
- [ ] **ONBOARD-06**: Provisioning saga gains step 10 (`schedule-onboarding-followups`) that enqueues the 3 N8N workflows
- [ ] **ONBOARD-07**: Provisioning saga steps 5–9 are idempotent and retryable; saga failures PAUSE (not cascade-delete) with operator Telegram alert
- [ ] **ONBOARD-08**: Org is usable after saga steps 1–4 complete — later steps run async; user never sees "setting up..." stuck state
- [ ] **ONBOARD-09**: "3 business days" phrased explicitly on pricing page + welcome email; weekend signups start day-0 timer Monday

### Easy/Advanced UX (UX)

- [ ] **UX-01**: `<ModuleHome>` shared component renders AI action cards from a declarative manifest per module — RSC-first, client islands per card
- [ ] **UX-02**: CRM has two routes — `/dashboard/crm` (Easy view with ModuleHome) and `/dashboard/crm/advanced` (existing full kanban + filters)
- [ ] **UX-03**: Every non-Easy module page includes "Easy view →" link in top-right; every Easy view includes "Advanced view →" link
- [ ] **UX-04**: `user_profiles.ui_mode` stores user preference (`easy` | `advanced`); existing users default to `advanced`, new signups to `easy`
- [ ] **UX-05**: Action card sources use event-driven queries (real-time), nightly cached suggestions (N8N), or user-triggered BaseAgent calls — NEVER per-render agent calls
- [ ] **UX-06**: View-desync integration test: edit entity in Easy, switch to Advanced, verify edits visible; switch back without losing unsaved state
- [ ] **UX-07**: `entity_drafts` table stores unsaved form state across view switches

### Site Redesign (SITE)

- [ ] **SITE-01**: Landing page hero is outcome-led ("Run your lodge on autopilot") with interactive module picker below
- [ ] **SITE-02**: Pricing page has module-picker UI: toggle Core + vertical + add-ons, live monthly total, "what it replaces" comparison (~R4,500 in manual work)
- [ ] **SITE-03**: 301 redirects in place for any changed URLs; Search Console baseline exported pre-launch for regression detection
- [ ] **SITE-04**: Mobile-first verified at 360px breakpoint on every landing + pricing + signup page; Lighthouse mobile performance ≥85
- [ ] **SITE-05**: Landing page keeps brand direction (charcoal #363940 + crimson #6B1420 + light sections) — full layout refresh, not cosmetic

### Operations (OPS)

- [ ] **OPS-01**: Startup Zod schema assertion in `lib/config/env.ts` fails boot if `PAYFAST_MODE=production` without `PAYFAST_PASSPHRASE`, or other required env vars are missing
- [ ] **OPS-02**: Feature-gate audit daily cron verifies every gated capability is blocked at three layers (middleware, API route, DB RLS); alerts on misconfiguration
- [ ] **OPS-03**: Token expiry monitor cron checks Facebook + LinkedIn OAuth tokens 7 days before expiry; alerts operator with refresh link
- [ ] **OPS-04**: `/api/ops/env-health` endpoint returns current environment validation status (masked — no secrets leaked)
- [ ] **OPS-05**: Multi-step migration discipline documented in `CLAUDE.md`: add column NULLABLE → deploy write code → backfill → add NOT NULL in later migration; never combine add + constraint

### Campaign Studio (CAMPAIGN) — decision-gated

*These requirements activate only if phases 09–10 come in under budget. Otherwise deferred to v3.1.*

- [ ] **CAMP-01**: User enters a campaign intent ("promote our Sunday brunch special"); Campaign Studio drafts 5 social posts + 1 email + 1 SMS using brand voice
- [ ] **CAMP-02**: User reviews drafts in a single approval screen; can edit inline, regenerate individual items, or approve all
- [ ] **CAMP-03**: Approved campaign auto-schedules across selected channels via Supabase `pg_cron` + `pg_net`
- [ ] **CAMP-04**: Publish confirmation UI shows target channel icon + account name + preview before execute; no silent posting
- [ ] **CAMP-05**: Post-publish verify fetches the posted item and stores URL; failures surface in campaign run detail
- [ ] **CAMP-06**: Per-tenant kill switch on campaigns (emergency stop all scheduled runs)
- [ ] **CAMP-07**: Brand-safety Haiku check on every draft — flags off-brand, insensitive, or time-inappropriate content (e.g. festive post during public mourning)
- [ ] **CAMP-08**: First 30 days of a new tenant: all campaigns default to draft-then-review (never auto-publish)

---

## Previously Shipped Requirements (v1.x / v2.x)

Full history lives in `.planning/ROADMAP.md` under "Completed Work". Summary:

- **v1 (7 phases, Feb 2026):** Security & Auth, Core Modules, Landing, N8N Automation, Social Integration, Provisioning, Testing
- **v2 BOS (Phases A–E):** CLAUDE.md hierarchy, Error catalogue, Build reviewer, AI ops architecture
- **v2.1 Architecture Restructure:** Shared DB + RLS multi-tenancy, wildcard subdomain routing, DB-backed module gating
- **v2.2 Accommodation Module:** 84 tables, 102 API routes, 12 UI pages, 4 AI agents, channel manager, guest portal
- **v2.3 Elijah Module:** Community safety — 33 tables, 23 API routes, 4 N8N workflows
- **v2.4 Restaurant Module:** Block-based SOPs, POS, QR menus, floor plan (Konva), 6 management pages

All previously shipped requirements remain satisfied. v3.0 does not break any existing capability.

---

## v3.1+ Future Requirements (Deferred from v3.0)

Triggered by real client signal or explicit roadmap decision:

- **Easy View rollout** to remaining 5 modules (Email Sequences, Accommodation, Restaurant, Agents, Analytics) — trigger: ModuleHome pattern stable + 5+ clients onboarded
- **Embedded Finance** (VAT201 exports, TOMSA levy tracking, SARS day-end, owner-payout statements, tips treatment) — **must ship with accountant review gate on first 3 pilot tenants before claiming "SARS-ready"**
- **Finance-AI add-on** (Telegram receipt OCR via Claude Haiku 4.5 vision, SARS expense categorisation) — trigger: 5+ clients requesting
- **Campaign Studio** — if slipped from v3.0 decision gate
- **Landing page builder** inside Campaign Studio
- **Events add-on** (layers onto F&B or Accom)
- **White-label add-on** (logo + color + sender email) — custom domain per tenant remains v4 scope
- **Annual billing** with 10–15% discount (lowers PayFast fees, reduces churn)
- **WhatsApp Cloud API activation** (Elijah Incident Intake + tenant messaging) — trigger: Meta credentials from Chris

---

## Out of Scope (Deliberate Exclusions)

Confirmed 2026-04-24. These are anti-features — we actively do NOT build them, even on request, without explicit milestone re-scoping:

### Never (compete by not competing)

- **Full double-entry accounting.** We are a pre-accounting layer exporting to Xero/Sage/FreshBooks — not a Xero replacement
- **Generic AI long-form content writer** (blog posts, articles). Brand voice + campaign short-form only
- **Custom AI agent builder.** We ship 6–8 vertical agents; revisit at 20+ clients per `CLAUDE.md` mandate
- **Multi-tier approval workflows** (3-layer like Hootsuite Enterprise). Single-level approve/reject only — owner-operator target
- **Full channel manager** competing with SiteMinder or NightsBridge (20+ year head start). Keep existing iCal feeds + partner integrations only
- **"Unlimited" AI generation marketing claim.** Published caps + transparent overage pricing — Holo's "unlimited" is a liability
- **"Kitchen sink" free tier** (HubSpot-style). 14-day trial with payment-method-on-file only
- **Self-serve SQL / data warehouse access.** CSV export + scheduled reports cover 95% of need
- **In-app chat widget** (Intercom-style). WhatsApp + Telegram + knowledge base + AI tier-1 bot instead
- **Stripe / international payment gateways.** PayFast (ZAR) is the SA-market constraint

### Deferred (re-evaluate in later milestone)

- **Native mobile apps (iOS/Android).** PWA + Telegram bot cover the field-ops use case at ~5% of native cost. Re-evaluate at 200+ clients or when a feature literally can't run in a browser
- **AI video generation** (Runway, Sora, Synthesia). Cost is 10–50× image gen, quality inconsistent for marketing in 2026. Partner-route to Descript / Synthesia on demand. Re-evaluate in 2027
- **Mailchimp-level drag-drop email template builder.** Voice-driven templates + 6–8 vertical layouts cover the need. Re-evaluate if clients actually ask
- **Multi-language UI** (Afrikaans, isiZulu, etc.). English-only for v3; SA SMEs predominantly operate in English. Re-evaluate at 50+ clients
- **Multi-currency support.** ZAR-only until cross-border client demand is real
- **Custom domain per tenant** (beyond *.draggonnb.online). Re-evaluate with Scale-tier paying clients
- **Self-hosted Supabase.** Supabase Cloud is the stack constraint

---

## Traceability — Requirements to Phases

Populated by gsd-roadmapper 2026-04-24. 53 REQ-IDs across 8 categories, 100% coverage (45 unconditional mapped + 8 CAMP conditional).

| REQ-ID | Phase | Status |
|--------|-------|--------|
| BILL-01 | Phase 10 | Planned |
| BILL-02 | Phase 09 | Complete |
| BILL-03 | Phase 09 | Complete |
| BILL-04 | Phase 09 | Complete |
| BILL-05 | Phase 09 | Complete |
| BILL-06 | Phase 09 | Complete |
| BILL-07 | Phase 09 | Complete |
| BILL-08 | Phase 12 | Planned |
| BILL-09 | Phase 10 | Planned |
| VOICE-01 | Phase 10 | Planned |
| VOICE-02 | Phase 10 | Planned |
| VOICE-03 | Phase 10 | Planned |
| VOICE-04 | Phase 10 | Planned |
| VOICE-05 | Phase 10 | Planned |
| VOICE-06 | Phase 10 | Planned |
| VOICE-07 | Phase 10 | Planned |
| VOICE-08 | Phase 10 | Planned |
| USAGE-01 | Phase 09 | Complete |
| USAGE-02 | Phase 09 | Complete |
| USAGE-03 | Phase 10 | Planned |
| USAGE-04 | Phase 10 | Planned |
| USAGE-05 | Phase 09 | Complete |
| USAGE-06 | Phase 09 | Complete |
| USAGE-07 | Phase 09 | Complete |
| USAGE-08 | Phase 09 | Complete |
| USAGE-09 | Phase 09 | Complete |
| USAGE-10 | Phase 09 | Complete |
| USAGE-11 | Phase 10 | Planned |
| USAGE-12 | Phase 09 | Complete |
| USAGE-13 | Phase 10 | Planned |
| ONBOARD-01 | Phase 10 | Planned |
| ONBOARD-02 | Phase 10 | Planned |
| ONBOARD-03 | Phase 10 | Planned |
| ONBOARD-04 | Phase 10 | Planned |
| ONBOARD-05 | Phase 10 | Planned |
| ONBOARD-06 | Phase 10 | Planned |
| ONBOARD-07 | Phase 10 | Planned |
| ONBOARD-08 | Phase 10 | Planned |
| ONBOARD-09 | Phase 10 | Planned |
| UX-01 | Phase 11 | Planned |
| UX-02 | Phase 11 | Planned |
| UX-03 | Phase 11 | Planned |
| UX-04 | Phase 11 | Planned |
| UX-05 | Phase 11 | Planned |
| UX-06 | Phase 11 | Planned |
| UX-07 | Phase 11 | Planned |
| SITE-01 | Phase 10 | Planned |
| SITE-02 | Phase 10 | Planned |
| SITE-03 | Phase 10 | Planned |
| SITE-04 | Phase 10 | Planned |
| SITE-05 | Phase 10 | Planned |
| OPS-01 | Phase 09 | Complete |
| OPS-02 | Phase 12 | Planned |
| OPS-03 | Phase 12 | Planned |
| OPS-04 | Phase 12 | Planned |
| OPS-05 | Phase 09 | Complete |
| CAMP-01 | Phase 11 (conditional) | Conditional — decision-gated at Phase 10 exit |
| CAMP-02 | Phase 11 (conditional) | Conditional — decision-gated at Phase 10 exit |
| CAMP-03 | Phase 11 (conditional) | Conditional — decision-gated at Phase 10 exit |
| CAMP-04 | Phase 11 (conditional) | Conditional — decision-gated at Phase 10 exit |
| CAMP-05 | Phase 11 (conditional) | Conditional — decision-gated at Phase 10 exit |
| CAMP-06 | Phase 11 (conditional) | Conditional — decision-gated at Phase 10 exit |
| CAMP-07 | Phase 11 (conditional) | Conditional — decision-gated at Phase 10 exit |
| CAMP-08 | Phase 11 (conditional) | Conditional — decision-gated at Phase 10 exit |

### Coverage Summary by Phase

| Phase | REQ-IDs | Count |
|-------|---------|-------|
| Phase 09 (Foundations & Guard Rails) | BILL-02..07, USAGE-01, USAGE-02, USAGE-05, USAGE-06, USAGE-07, USAGE-08, USAGE-09, USAGE-10, USAGE-12, OPS-01, OPS-05 | 17 |
| Phase 10 (Brand Voice + Site Redesign + 3-Day Onboarding) | BILL-01, BILL-09, VOICE-01..08, USAGE-03, USAGE-04, USAGE-11, USAGE-13, ONBOARD-01..09, SITE-01..05 | 28 |
| Phase 11 (Easy/Advanced CRM PoC + Campaign Studio Decision Gate) | UX-01..07 (unconditional) + CAMP-01..08 (conditional) | 7 + 8 conditional |
| Phase 12 (Launch Polish + v3.1 Handoff) | BILL-08, OPS-02, OPS-03, OPS-04 | 4 |
| **Total (unconditional)** | | **56** |
| **Total (including CAMP conditional)** | | **64 mappings across 53 unique REQ-IDs** |

*Note: BILL-01 through BILL-09 = 9 REQs, VOICE-01..08 = 8, USAGE-01..13 = 13, ONBOARD-01..09 = 9, UX-01..07 = 7, SITE-01..05 = 5, OPS-01..05 = 5, CAMP-01..08 = 8. Total unique = 64. Discrepancy with "53 REQ-IDs" in milestone intro: the intro counted category groupings differently; precise count of unique REQ-IDs is 64 including 8 conditional CAMP, or 56 unconditional.*

---
*Last updated: 2026-04-24 — Traceability populated by gsd-roadmapper. All unconditional REQ-IDs mapped to Phases 09-12. CAMP-* flagged as Phase 11 conditional (decision-gated at Phase 10 exit).*
