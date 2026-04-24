# v3.0 Research Summary — DraggonnB OS "Commercial Launch"

**Project:** DraggonnB OS v3.0 — subsequent milestone on live multi-tenant B2B SaaS (SA SME market)
**Researched:** 2026-04-24
**Confidence:** HIGH on existing-codebase grounding and verified external facts (PayFast API, Anthropic pricing, SARS VAT, library currency); MEDIUM on PayFast ad-hoc endpoint specifics and brand-voice cache isolation behavior
**FX:** USD/ZAR = 16.6 (April 2026)

---

## Bottom Line

- **We have more infrastructure than we thought.** `billing_plans`, `billing_invoices`, `credit_purchases`, `credit_ledger`, `usage_events`, `record_usage_event()`, `client_profiles` (brand voice fields), `emitBookingEvent()`, BaseAgent, 9-step provisioning saga — all already exist. v3.0 is mostly **integration, composition, UX, and enforcement wiring** — not foundational schema. This reframes Sprint 1 from "build billing infra" to "compose what exists + plug the dual-state gaps."
- **We have less than we thought in four specific places** — critical context corrections listed below. These are the single most important inputs to the roadmap.
- **Scope is larger than the 4-sprint target suggests.** Features research estimates 63–90 dev-days for P1 scope (~12–18 weeks solo, ~6–9 weeks with 2 devs). The original 4-sprint plan needs ruthless scoping: Modular Pricing + Brand Voice + Usage Caps + Onboarding + Pricing Page Rewrite + ONE Easy/Advanced module go in v3.0; Campaign Studio lands late-v3.0 or slips to v3.1; Embedded Finance (riskiest) is v3.1 with accountant-review gate.
- **Two catastrophic risks must land Sprint 1 before any AI feature ships:** (1) per-tenant Anthropic cost ceiling with circuit breaker (CATASTROPHIC runaway risk on R599 tier), (2) tenant-scoped prompt-cache keys for brand voice (CATASTROPHIC POPI + cross-tenant leak risk). Without these, the business model breaks on first abuse or first cache collision.
- **Unit economics hold at ~R7/mo variable cost for starter tier (~99% margin on AI ops), R80-150 for pro tier.** But only if Haiku 4.5 is enforced as default AND prompt caching is instrumented AND system prompts hit the 4,096-token minimum for Haiku cache eligibility. Miss any of these and costs 10x silently.

---

## Context Corrections (from ARCHITECTURE — these are the load-bearing corrections)

The milestone brief contained four technical claims that are factually wrong against the live codebase. These reshape the roadmap more than any other input.

| Claim in brief | Reality | Roadmap impact |
|----------------|---------|----------------|
| `tenant_modules.limits` will store plan limits | **False.** `tenant_modules` has `config JSONB` only. Plan limits live in `billing_plans.limits` (migration 11). Usage tracked in `usage_events` (migration 12). | Do NOT add limits to `tenant_modules`. Use existing `billing_plans.limits` + `record_usage_event` RPC. Shortens Sprint 1. |
| `agent_sessions.cost_usd` exists | **False.** `agent_sessions` has `tokens_used INTEGER` only. No cost column. | Add ALTER migration (`28_agent_cost_columns.sql`): `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens`, `cost_zar_cents`, `model`. Compute cost at insert time in `BaseAgent.run()`. |
| `PRICING_TIERS` in `lib/payments/payfast.ts` is the source of truth | **Partially dead.** `billing_plans` table already exists and `lib/billing/plans.ts` reads from it. The constant is legacy, still referenced by `app/pricing/page.tsx` + webhook. Pricing page UI hasn't fully migrated. | Don't delete the constant — keep it as build-time seed that mirrors DB. Add CI assertion test that catches drift. Migrate runtime to `getPlans()`, delete constant only when zero imports remain. |
| Brand voice is a net-new capability requiring new table | **False.** `client_profiles` already has `tone`, `brand_do[]`, `brand_dont[]`, `brand_values[]`, `tagline`, `content_pillars[]`, `unique_selling_points[]`. Used in autopilot UI. | Extend `client_profiles` via `ALTER TABLE` (add `example_phrases TEXT[]`, `forbidden_topics TEXT[]`). Do NOT create a new `brand_voice` table. Saves 2-3 days. |

**Latent defect surfaced:** Usage metering is in **dual-state.** Legacy `client_usage_metrics` (migration 00) is still written by `lib/billing/subscriptions.ts::handlePaymentComplete()` and read by `lib/tier/feature-gate.ts::checkUsage()` AND `app/(dashboard)/dashboard/page.tsx`. New `usage_events` + `record_usage_event` RPC is available via `lib/usage/meter.ts::recordUsage()`. **Both exist. Routes probably use one or the other inconsistently.** Sprint 1 must include an audit: find every read/write of `client_usage_metrics`, either migrate to `usage_events` or delete the write. This is invisible technical debt that modular-pricing work will surface painfully if ignored.

**Restaurant module gap (flagged for validation):** `lib/restaurant/` has `api-helpers`, `constants`, `payfast`, `telegram` — but `restaurant_orders` table may not exist. Audit this in Sprint 3 before committing Sprint 4.6 (restaurant finance adapter). If missing, restaurant finance slips to v3.1.

---

## Scope Reality Check

Features research estimates the following for P1 (v3.0 MVP) scope:

| Capability | Estimate (dev-days) | Priority |
|------------|---------------------|----------|
| 1. Modular pricing + PayFast rewrite + setup fee + migration | 8–10 | P1 |
| 2. Easy/Advanced toggle + shared ModuleHome (one module) | 8–12 | P1 |
| 3. ModuleHome applied to 2 modules | bundled with #2 | P1 |
| 4. Site redesign + interactive module picker | 5–7 | P1 |
| 5. Brand voice capture + injection across 6 agents | 7–10 | P1 |
| 6. Campaign Studio v1 (no landing page) | 10–15 | P1 — **at risk** |
| 7. Usage caps + alerts + cost dashboard | 5–7 | P1 |
| 8. Embedded finance (VAT201 + TOMSA + tips + day-end + owner payout) | 10–15 | **P2 — defer to v3.1** |
| 9. Finance-AI (Telegram OCR) | 5–7 | P2 — defer |
| 10. 3-day onboarding sequence | 5–7 | P1 |
| Testing + polish + error catalogue pattern fixes | 5–7 | P1 |
| **Total P1 original** | **63–90 dev-days (12–18 weeks solo)** | |

**Recommendation — what goes in v3.0 vs what slips:**

| Capability | v3.0 verdict | Rationale |
|------------|--------------|-----------|
| #1 Modular pricing + composition | **v3.0** | Revenue unlock — without it, new pricing doesn't exist |
| #4 Site redesign + module picker | **v3.0** | Conversion is the whole point of the launch |
| #5 Brand voice (capture + inject into existing 6 agents) | **v3.0** | Foundation for moat; unlocks Haiku caching savings immediately |
| #7 Usage caps + cost dashboard | **v3.0** | Without caps, unit economics break on first abuse |
| #10 3-day onboarding | **v3.0** | Activation; closes the "sign-up → first value" loop |
| #2+#3 Easy/Advanced (ONE module, CRM as proof-of-concept) | **v3.0** | Validate the pattern, don't roll to 6 modules yet |
| #6 Campaign Studio v1 | **Late v3.0 OR v3.1** | Decision gate: if Sprints 1–2 come in under budget, include; else slip |
| Roll Easy mode to remaining 5 modules | **v3.1** | Replicate ModuleHome pattern once validated |
| #8 Embedded Finance (VAT/TOMSA/tips/day-end/owner-payout) | **v3.1** | Highest blast radius (SARS-audit risk — see Pitfall 6); ship with accountant-review gate on 3 pilot tenants |
| #9 Finance-AI (Telegram OCR) | **v3.1 or later** | Depends on #8; P2 trigger is "5+ clients asking" |
| Events add-on, white-label, landing page builder, annual billing | **v3.1+** | P2 post-launch based on signal |

**Proposed v3.0 footprint: ~40–55 dev-days (8–11 weeks solo, 4–6 weeks with 2 devs).** Leaner but realistic given founder-is-sole-builder constraint.

---

## Stack Decisions Locked (from STACK.md)

### New dependencies (required for v3.0)

| Tech | Purpose | Cost impact |
|------|---------|-------------|
| **Claude Haiku 4.5 default** (model ID, no new lib) | Vision OCR, brand voice gen, campaign drafting | $1/$5 per M tokens — 3-5× cheaper than Sonnet. **Required** for R599 unit economics |
| **Anthropic prompt caching** (`@anthropic-ai/sdk` ≥0.73 already installed) | Cache per-tenant brand-voice system prompt | Cache read = 0.1× input cost. Break-even at 2nd read within 5 min |
| **`grammy`** (^1.37) | Telegram webhook handler for Finance-AI receipt OCR | Modern TS-first, App-Router-native |
| **`@upstash/ratelimit` + `@upstash/redis`** | Per-tenant usage caps + overage detection at edge | Free tier: 10k cmds/day covers ~100 tenants |
| **`@fal-ai/client`** (^1.x, replaces deprecated `@fal-ai/serverless-client`) | Campaign image generation | FLUX.1 schnell $0.003/MP (~R0.05/image) |
| **`unpdf`** (^0.12) | PDF receipt/statement parsing | Zero-native-deps, Vercel-serverless-safe (replaces `pdf-parse`) |
| **`@tanstack/react-table`** | Cost monitoring + usage drill-down dashboards | Virtualizes 10k+ rows |
| **Supabase `pg_cron` + `pg_net`** | Scheduled campaigns | No Vercel Pro upgrade, no per-tenant N8N workflow |

### Explicitly rejected

`pdf-parse` (unmaintained, breaks on Vercel), `node-telegram-bot-api` (polling model, incompatible with App Router), `telegraf` (heavier than grammy), Tesseract/Textract/GCP Vision (single-purpose adds cost + loses context for categorization — Claude Haiku 4.5 vision does OCR+categorize in one call at ~R0.058/receipt), Stripe (PayFast already ZAR-native), Xero/Sage SDK (v3.1+ integration, not v3.0 scope), SA-specific tax/accounting libs (none mature — use CSV/PDF templates matching SARS VAT201 columns).

### Unit-economics specifics (the numbers that determine margin)

| Operation | Specifics |
|-----------|-----------|
| Haiku 4.5 cache minimum | **4,096 tokens** (NOT 1,024 like Sonnet/Opus). System prompts below this do NOT cache. Pad with stable module context if brand voice alone is under threshold. |
| Anthropic workspace isolation | Moved to **workspace-level** 2026-02-05. Since we run ONE DraggonnB workspace for all tenants, cross-tenant cache hits ARE possible. **Must inject `org_id` as a distinct block at the start of system prompt** to force cache miss between tenants. |
| Cost per campaign generation (Haiku, 3k in / 600 out, 70% cache hit) | ~$0.0015 effective → **R0.025/generation** |
| Cost per brand voice cache read (2-3k tokens) | $0.00003 → **R0.0005/read** |
| Cost per receipt OCR scan (Haiku vision, 1568px image + 400 prompt + 300 out) | ~$0.0035 → **R0.058/receipt** |
| Cost per campaign image (FLUX.1 schnell @ 1MP) | $0.003 → **R0.05/image** |
| Cost per campaign image (Nano Banana Pro, premium) | $0.039 → **R0.65/image** |
| **Starter tenant variable cost/month** (100 gens + 30 images + 50 receipts + 500 emails + 50 posts) | **~R7/month → 98.8% gross margin on AI ops** at R599 MRR |
| **Pro tenant variable cost/month** (heavy Campaign Studio user) | ~R80–150/month → 91–95% margin on R1,798 base+vertical |

---

## Architecture Shape

**Layered additions on existing stack (zero foundational rewrites):**

1. **Edge** (no changes) — middleware continues subdomain resolution + module gating. Usage enforcement is NOT added to middleware (perf reasons); lives in API routes.
2. **App layer** — new routes under `/api/billing/{compose,checkout-cart,addons}`, `/api/campaigns/*`, `/api/finance/*`, `/api/onboarding/day-*`, `/api/webhooks/telegram-finance`. Existing PayFast webhook branches on `m_payment_id` prefix (`DRG-*` subscription, `ADDON-*` new module, `TOPUP-*` credit pack).
3. **Lib layer** — new modules under `lib/billing/{composition,addons}`, `lib/brand/`, `lib/campaigns/`, `lib/finance/{knowledge,ledger}`, `lib/onboarding/`, `lib/telegram/finance/`, `lib/usage/middleware-guard.ts`.
4. **Data layer** — 8 new migrations (`22` through `29`). Key additions: `billing_addons_catalog`, `subscription_composition`, `campaign_runs`, `finance_transactions`, `finance_receipts`, `onboarding_progress`, `daily_cost_rollup`, ALTER `agent_sessions` (cost columns), ALTER `client_profiles` (brand voice extras). **No changes to `organizations`, `tenant_modules`, `billing_plans`, `usage_events`, or `credit_*`.**
5. **External** — existing N8N (add 3 onboarding workflows + 1 cost-rollup), existing Anthropic (add cache breakpoint), existing PayFast (add one-off flows), NEW Telegram finance bot (separate token from ops bot), existing Resend.

**Six load-bearing architectural patterns:**

1. **Composable billing** — Order = base plan + modules + overage packs. Three distinct PayFast flows by `m_payment_id` prefix. `subscription_composition` = 1 row per org (current state); `billing_invoices.line_items[]` = moment-of-billing detail. PayFast amendment via cancel-and-recreate (already proven in `cancelPayFastSubscription`).
2. **ModuleHome + declarative AI-action-card manifest** — RSC-first pattern. Two routes per module (`/dashboard/[module]` Easy + `/dashboard/[module]/advanced`), NOT one route with conditional rendering. Each module exports a manifest; ModuleHome renders it. Action freshness: event-driven (real-time query) vs cached nightly (N8N) vs on-demand BaseAgent (user click) — NOT per-render AI calls.
3. **Brand voice as cached system block** — Extend `client_profiles`, do NOT create new table. Inject as separate system block with `cache_control: { type: 'ephemeral' }`, order-first so it's the stable cached prefix. Task prompt is second block (varies, not cached). `org_id` injected as distinct block first to force tenant-scoped cache keys.
4. **Usage enforcement via DB RPC at route level** — `guardUsage(orgId, metric)` helper calls existing `record_usage_event` RPC (atomic check+insert). NOT in middleware (would regress every request). Postgres `usage_events` stays source of truth (durability > Redis speed).
5. **Nightly cost monitoring** — Vercel cron → `/api/ops/cost-rollup` → aggregates `agent_sessions` + `usage_events` → `daily_cost_rollup` table. `/admin/cost-monitoring` page (platform_admin guard, pattern from `/admin/clients`) shows cost-vs-revenue per tenant, 30-day trend, margin %.
6. **Vertical finance adapters over shared knowledge** — `lib/finance/knowledge/*` pure functions (SA VAT 15%, TOMSA 1%, SARS formats). `lib/{accommodation,restaurant}/finance/*` thin adapters hook into `emitBookingEvent()` subscriber pattern. Zero changes to accommodation business logic — just a new listener.

---

## Critical Pitfalls to Guard (severity-ordered)

### CATASTROPHIC — must land Sprint 1 before any AI feature ships

| # | Pitfall | Guard (Sprint 1 non-negotiable) |
|---|---------|----------------------------------|
| **1** | `PRICING_TIERS` mutation breaks existing billing mid-flight (ITN validates received amount against CURRENT price, not price at subscribe time) | `organizations.billing_plan_snapshot JSONB` column. ITN reads from snapshot. Rename `PRICING_TIERS_V3`, keep V2 legacy. `pricing_changelog` table; never delete history. Audit 8 existing orgs: test vs dormant vs paying. |
| **3** | Anthropic cost runaway on single abusive tenant (R3k/day Claude bill on R1,500/mo tier) | `ai_usage_ledger` table (write after every BaseAgent call inc. retries). Per-tier ZAR ceilings: Core R150, Growth R400, Scale R1,500. Check BEFORE the Anthropic call. Enforce Haiku 4.5 default (never silent Sonnet fallback). 10 calls/org/min circuit breaker via Redis. Alerts at 50/75/90%. Auto-pause agents at 100%. |
| **4** | Brand voice prompt-cache key collision → tenant A sees tenant B's voice (POPI breach) | `org_id` as first distinct block in system prompt (forces cache miss between tenants). PII scrubber on brand voice input before storing. Tenant-specific hash on cached block. Golden test in CI: two orgs, identical prompts, assert different outputs. Voice length 4,096–30,000 tokens window (hit cache, don't bloat). |
| **6** | Finance tax-calc error causes client's SARS audit (existential reputation damage) | **Do not auto-file returns — generate drafts with disclaimers.** VAT rate from `tax_rates` table, NEVER hard-coded. Line-item cents (integer), sum at invoice level. Zero-rating requires explicit flag + evidence (passport, out-of-SA proof per SARS VAT 411). `finance_audit_log` per calculation. Accountant review gate for first 3 tenants before claiming "SARS-ready." Defer to v3.1. |

### HIGH — must land Sprint 1 / early Sprint 2

| # | Pitfall | Guard |
|---|---------|-------|
| **2** | PayFast subscription state desync (we update price, PayFast keeps charging old) | `lib/payments/payfast-subscription-api.ts` with `updateSubscriptionAmount(pf_token, new_amount)`. Store `pf_token` on `organizations.payfast_subscription_token`. Explicit operator flow on pricing change. 30-day customer notice. |
| **5** | Usage-cap counter race condition (concurrent requests exceed cap) | Use `record_usage_event` RPC (atomic check+insert, already exists). Or Postgres CTE. 50-concurrent-request unit test on cap boundary. Idempotency keys on increment endpoints. |
| **7** | Easy/Advanced view desync | Two routes, two trees (not conditional render). One server-side source of truth. Same React Query cache key. `entity_drafts` table for unsaved state on view switch. Integration test. |
| **8** | Campaign Studio posts to wrong account / wrong channel | Publish confirmation UI with channel icon + account name + preview. Token expiry cron (7-day alert). Kill switch per tenant. Post-publish fetch + verify. Brand-safety Haiku check. Default = draft-then-review for first 30 days. |
| **9** | Hard cap triggered at worst-possible moment | Soft warnings at 50/75/90%. At 100%: THREE options inline (upgrade / pay overage / wait with exact reset). 10% silent grace in month 1 of tenant life. Monthly reset uses tenant TZ. |
| **10** | Provisioning saga fails mid-flight, client sees "setting up..." forever | `provisioning_jobs` state table. Failures PAUSE (not cascade-delete). Operator Telegram alert. Steps 5-9 IDEMPOTENT + RETRYABLE. Steps 5-9 OPTIONAL — org is USABLE after steps 1-4. Health check per dependency before saga start. |
| **11** | Env var sprawl + `PAYFAST_MODE=sandbox` in production | Startup Zod schema assertion. Assert `PAYFAST_MODE === 'production'` when `VERCEL_ENV === 'production'`. `/api/ops/env-health` endpoint. CI schema-version check. |
| **12** | DB migration breaks RLS or existing-data invariants mid-deploy | Multi-step pattern: (1) add column NULLABLE, (2) deploy code that writes it, (3) backfill, (4) add NOT NULL in later migration. Never combine "add column" + "add constraint." Test against Supabase branch. |
| **15** | Feature-gate misconfig — Campaign Studio accessible to unpaid Core clients | Gate in THREE places: middleware + API route + DB RLS. Integration test per feature. Daily audit cron. Drop legacy tier names in new code. |

### MEDIUM — Sprint 2+ guards

Cache-hit miss (16, 4,096-token floor), OCR cost scale (17), Telegram flood (18), voice staleness (19), mobile-first failures (20), Easy→Advanced edits lost (21), setup fee + recurring combo (22), monthly reset timezone bugs (23), 3-day promise ambiguity (24), PayFast passphrase differences (25), SEO regression (13), Resend deliverability (14).

Full severity map and recovery strategies in PITFALLS.md.

---

## Cross-Cutting Decisions for Chris

These decisions require input **before the roadmap is written** because they shape phase boundaries.

### Decision 1: PayFast billing strategy

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Variable-amount subscription** (one token, recalculate on module change) | One invoice/month; clean UX; matches "single monthly invoice" differentiator | PayFast amendment path is cancel-and-recreate (loses billing continuity); token lifecycle complexity | **PRIMARY** for recurring base + modules |
| **Ad-hoc stacking** (recurring subscription + separate one-offs for setup fees, overage top-ups) | Clean separation of recurring vs one-off; STACK confirms adhoc support | Multiple PayFast charges per month confuse SMEs (Pitfall 22) | **SECONDARY** for implementation fees + overage |

**Recommendation: Hybrid.** Recurring subscription = base + modules (variable amount; cancel-and-recreate on addon change). One-off ad-hoc = setup fees + overage top-ups. Webhook branches on `m_payment_id` prefix: `DRG-*` subscription, `ADDON-*` new module, `TOPUP-*` credit pack, `ONEOFF-*` implementation fee.

**Open spike (Sprint 1):** 1-day PayFast sandbox spike to verify the `/subscriptions/{token}/adhoc` endpoint path (docs are thin publicly — must verify via PHP SDK source). If the spike reveals the ad-hoc endpoint doesn't behave as expected, fallback is to capture overage amount and invoice manually end-of-month for v3.0, ship automated ad-hoc in v3.1.

**Chris decision:** Confirm hybrid approach OR pick single-path simpler variant.

### Decision 2: Scope realism — what ships in v3.0 vs v3.1

The 4-sprint target was optimistic. Recommendation:

**v3.0 (realistic 8–11 weeks solo / 4–6 weeks with 2 devs):**
1. Modular pricing + PayFast composition (includes billing snapshot + cost ceilings guard rails)
2. Usage caps + cost dashboard + Anthropic circuit breaker
3. Brand voice capture + injection into 6 existing agents
4. Site redesign + interactive module picker + pricing page rewrite
5. 3-day onboarding (automated emails + checklist)
6. Easy/Advanced ModuleHome pattern — CRM only (proof of concept)
7. Campaign Studio v1 — **decision gate at end of Sprint 2:** include only if Sprints 1–2 under budget

**v3.1 (post-launch, trigger-based):**
- Easy View rollout to remaining 5 modules (trigger: ModuleHome pattern stable + 5+ clients onboarded)
- Embedded Finance (VAT201 + TOMSA + tips + day-end + owner-payout) — **ships with accountant-review gate on first 3 pilot tenants**
- Finance-AI add-on (Telegram OCR) — trigger: 5+ clients requesting
- Events add-on, white-label, landing page builder, annual billing

**Chris decision:** Confirm v3.0 footprint, or expand to include Campaign Studio up front (accepts 2-3 more weeks), or further trim (remove ModuleHome pattern entirely and defer all UX work to v3.1).

### Decision 3: Existing 8-org migration strategy

Pitfall 1 is catastrophic and hits at the first deploy if not handled. Options:

| Option | Description | Risk |
|--------|-------------|------|
| **A. Grandfather all 8** | Freeze existing orgs on legacy pricing via `billing_plan_snapshot`. New pricing applies only to new signups. | LOW. Zero impact on existing. But leaves tech debt (two price regimes forever). |
| **B. Audit + migrate paying, delete test** | Classify each org: test (delete), dormant (delete or notify), paying (PayFast-side update to new pricing with 30-day notice). | MED. Requires per-org decision + customer communication. Cleanest long-term. |
| **C. Migrate all 8 to new pricing** | Announce change, PayFast subscription-update API for all. | HIGH. Risks customer churn on price change; SA consumer protection best practice says 30-day notice. |

**Recommendation: B (audit + migrate paying, delete test).** Includes a pre-launch inventory email to Chris listing all 8 orgs with classification. Sprint 1 ships the snapshot infrastructure; Sprint 2 runs the migration.

**Chris decision:** Which classification per org + acceptable communication cadence.

### Decision 4: Anti-features to deliberately exclude (17 flagged in FEATURES.md)

Worth Chris's confirmation that we are NOT building these in v3.0 or later:

**High-signal exclusions (confirm these):**
- Full double-entry accounting → ship as "pre-accounting layer" exporting to Xero/Sage (not as Xero replacement)
- Generic AI content writer (blog long-form) → brand voice + campaign short-form only
- Custom AI agent builder → ship 6-8 vertical agents, revisit at 20+ clients per CLAUDE.md mandate
- Multi-layered approval workflows (3-tier like Hootsuite) → single-level approve/reject only
- Full channel manager (compete with SiteMinder/NightsBridge) → keep existing iCal + partner integrations only
- "Unlimited" AI generation (Holo claim) → published caps + transparent overage pricing
- "Kitchen sink" free tier (HubSpot model) → 14-day trial with payment-method-on-file

**Potentially surprising exclusions (Chris confirm):**
- Mobile native apps → PWA + Telegram bot for field ops
- In-app chat support (Intercom) → WhatsApp/Telegram + knowledge base + AI tier-1 bot
- Video generation → partner with Descript/Synthesia if demand proves
- Self-serve SQL / data warehouse → CSV export + scheduled reports
- Fully customizable email template builder (Mailchimp-level) → voice-driven templates + 6-8 vertical layouts

**Chris decision:** Any of the 17 that should actually be in v3.0 or v3.1? Any that need flagging to prospects so they don't assume "DraggonnB does X"?

### Decision 5: Workspace-level Anthropic cache isolation strategy

STACK + PITFALLS both flag this. Anthropic moved to workspace-level cache isolation 2026-02-05. We run ONE DraggonnB workspace for all tenants, so cross-tenant cache hits ARE possible without explicit guard.

**Options:**
- **A. One Anthropic workspace per tenant** — true isolation, but operational overhead is massive. Not practical.
- **B. Tenant-scoped cache-key prefix** — inject `org_id` as first distinct block in system prompt. **Recommended.**
- **C. Disable prompt caching entirely** — safest but kills the 90% cost saving and breaks unit economics.

**Recommendation: B.** Golden CI test: provision two orgs with DIFFERENT voices, run identical prompts, assert outputs differ AND cache-read tokens on call 2 of same tenant > 0. Lands in Sprint 2 as gate on Brand Voice feature.

**Chris decision:** Confirm B (or escalate if a pilot tenant demands A).

---

## Recommended Phase Sequence

Phase structure derived from: dependency order (STACK + FEATURES), risk containment (PITFALLS Sprint 1 non-negotiables), revenue-unlock timing (paying client by end of Sprint 2), and architecture patterns (ARCHITECTURE build order).

### Phase 09 — Foundations & Guard Rails (Sprint 1, Weeks 1–2)

**Theme:** Ship billing composition + enforcement; land all catastrophic-pitfall guards before UI work begins.

**Delivers:**
- Pricing migration foundation (snapshot column, PRICING_TIERS_V3 rename, pricing_changelog)
- PayFast subscription-update API wrapper + token storage
- Billing composition schema + API (compose, checkout-cart, addons catalog)
- PayFast webhook prefix-branching (DRG-/ADDON-/TOPUP-/ONEOFF-)
- Anthropic cost ceiling + circuit breaker + per-tenant ledger
- Usage enforcement guard (route-level helper using existing `record_usage_event` RPC)
- `client_usage_metrics` ↔ `usage_events` dual-state audit + cleanup
- Agent cost columns migration
- Env schema assertion (Zod, startup validation)
- Multi-step migration discipline checklist in CLAUDE.md

**Avoids pitfalls:** 1, 2, 3, 5, 11, 12, 15, 22, 25

**Needs deeper research in planning:** YES — PayFast ad-hoc endpoint spike (1 day); verify PayFast subscription amendment path against sandbox; confirm Anthropic cache metrics are readable from SDK v0.73 response.

### Phase 10 — Brand Voice + Pricing Page + Onboarding (Sprint 2, Weeks 3–4)

**Theme:** Close the "sign-up → first paying client" loop. Ship brand voice + pricing UX + 3-day automated onboarding.

**Delivers:**
- Extend `client_profiles` (brand voice extras) + `lib/brand/loader.ts` + `lib/brand/prompt-injector.ts`
- Modify `BaseAgent` to accept optional `systemBlocks` + cache breakpoint (backwards-compatible)
- Brand voice capture wizard (URL ingest + 5 Qs + avoid-list) in existing `/onboarding` route
- Brand voice injected into all 6 existing agents (Quoter, Concierge, Reviewer, Pricer, LeadQualifier, ProposalGen)
- Tenant-scoped cache-key golden test (two-tenant CI gate)
- Site redesign + outcome-led hero + interactive module picker
- Onboarding saga state table (`onboarding_progress`), day-1/2/3 orchestrators, 3 N8N workflows
- Provisioning step 10 (schedule-onboarding-followups)
- Nightly cost rollup cron + `/admin/cost-monitoring` page
- Existing-tenant backfill migration (subscription_composition + user_profiles.ui_mode='advanced')

**Avoids pitfalls:** 4, 6 (deferred), 10, 13, 14, 16, 19, 24

**Needs deeper research in planning:** LIGHT — Resend deliverability baseline (mail-tester pre-launch); Search Console export before site changes; SA mobile-first testing plan.

**Exit criteria:** First paying client signs up, onboards, sees brand voice in AI outputs, Chris sees their cost-vs-revenue.

### Phase 11 — Easy/Advanced Proof-of-Concept + Campaign Studio Decision Gate (Sprint 3, Weeks 5–6)

**Theme:** Validate ModuleHome pattern on ONE module. Decide if Campaign Studio ships in v3.0 or slips.

**Delivers:**
- `components/module-home/*` (ModuleHome, AIActionCard, ModeToggle, ShortcutTile)
- `lib/module-home/types.ts` + manifest pattern
- CRM Easy mode at `/dashboard/crm` + Advanced at `/dashboard/crm/advanced`
- `user_profiles.ui_mode` preference + role-based defaults
- View-desync invariant test suite
- **Decision gate:** Campaign Studio v1 (planner + generator + scheduler + analytics) OR slip to v3.1

**If Campaign Studio proceeds:**
- `campaign_runs` migration
- `/api/campaigns/*` routes
- Campaign-safety guards: publish confirmation UI, token-expiry monitor, kill switch, post-publish verify, brand-safety Haiku check

**Avoids pitfalls:** 7, 8 (if Campaign Studio ships), 9, 18, 21

**Needs deeper research in planning:** LIGHT — ModuleHome pattern well-scoped from ARCHITECTURE. Campaign Studio multi-channel sequencing may need a design session before coding.

### Phase 12 — Launch Polish + Handoff to v3.1 (Weeks 7–8)

**Theme:** First paying clients validated. Document v3.1 trigger conditions.

**Delivers:**
- Billing-reconciliation nightly script (catches composition drift)
- Feature-gate audit cron (daily)
- Token expiry monitor cron (7-day lookahead)
- Brand voice PII scrubber + input sanitizer
- Mobile-first validation sweep (360px smoke test every page)
- Resend domain warm-up completion + SPF/DKIM/DMARC verification (mail-tester ≥9)
- Error catalogue pattern fixes from launch telemetry
- v3.1 trigger documentation

**Avoids pitfalls:** 20, plus reactive coverage of anything Sprint 1–3 missed

### v3.1 (post-launch, trigger-based)

1. **Easy Mode rollout to 5 remaining modules** — trigger: ModuleHome stable + ≥5 clients onboarded
2. **Embedded Finance** (VAT201 + TOMSA + tips + day-end + owner-payout) — **MUST ship with accountant review gate on first 3 pilot tenants before claiming "SARS-ready"**
3. **Finance-AI add-on** (Telegram OCR + SARS categorization) — trigger: 5+ clients requesting
4. **Campaign Studio** (if slipped from v3.0 Decision Gate)
5. **Landing page builder inside Campaign Studio**
6. **Events add-on, white-label, annual billing** — per P2 triggers

### Phase Ordering Rationale

- **Sprint 1 loads guard rails first.** All 4 CATASTROPHIC pitfalls have Sprint 1 guards.
- **Brand voice before Campaign Studio.** Campaign Studio draws value from voice-aware generation.
- **ModuleHome on ONE module first.** Pattern validation on CRM before replication.
- **Embedded Finance last / in v3.1.** Biggest blast radius (SARS-audit risk).
- **Revenue unlock by end of Sprint 2.** First paying client target at Sprint 2 exit.

---

## Open Questions for Phase Research

1. **PayFast `/subscriptions/{token}/adhoc` endpoint behavior** — Phase 09 spike.
2. **PayFast subscription amendment (variable-amount on addon toggle) — cancel-and-recreate vs in-place update** — confirm ITN continuity.
3. **Anthropic SDK v0.73 `usage.cache_read_input_tokens` + `cache_creation_input_tokens` response fields** — confirm readable in `BaseAgent.run()`.
4. **Haiku 4.5 4,096-token cache minimum — empirical test** — test with 3,500 and 4,200 token prompts.
5. **Brand voice tenant isolation** — two-org integration test.
6. **Restaurant module `restaurant_orders` table existence** — Phase 11 audit.
7. **Vercel cron hobby-tier limit audit** — count current `vercel.json` crons before adding cost-rollup.
8. **N8N workflow idempotency for onboarding day-1/2/3** — verify rerun doesn't duplicate sends.
9. **Existing 8 orgs classification** (test/dormant/paying) — inventory before billing-migration strategy.
10. **Resend domain warm-up state** — has `draggonnb.online` been warmed? What's current Gmail Postmaster status?

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | Claude/Haiku pricing verified against platform.claude.com/docs; grammy/Upstash/fal.ai against vendor docs and npm; MEDIUM only on PayFast ad-hoc endpoint. |
| **Features** | HIGH | Competitor patterns verified via multiple sources; SA compliance (TOMSA, SARS VAT201, tips) verified against official docs. |
| **Architecture** | HIGH (existing codebase) / MEDIUM (net-new integrations) | Four critical context corrections came from source-file reads. Net-new patterns reasoned from existing patterns + industry practice; not validated against prod traffic. |
| **Pitfalls** | HIGH | Pricing/PayFast/Anthropic/POPI/SARS facts verified against official sources. MEDIUM on brand-voice cache behavior under workspace-level isolation. |

**Overall confidence: HIGH.** The research is opinionated, grounded in the live codebase, and flags its own uncertainty in specific well-scoped places.

---

## Summary for Orchestrator

**Suggested phases:** 4 (plus v3.1 tail)

1. **Phase 09 — Foundations & Guard Rails** — pricing snapshot, cost ceilings, usage enforcement, composition schema; all CATASTROPHIC pitfall guards ship before any AI feature
2. **Phase 10 — Brand Voice + Site Redesign + 3-Day Onboarding** — first-paying-client readiness; brand voice into all 6 existing agents with tenant-scoped cache keys
3. **Phase 11 — Easy/Advanced PoC (CRM) + Campaign Studio Decision Gate** — validate ModuleHome pattern, decide Campaign Studio inclusion
4. **Phase 12 — Launch Polish + v3.1 Handoff** — reconciliation crons, audit crons, mobile sweep, error-catalogue patterns

**Ready for requirements:** Pending Chris decisions on (1) PayFast billing hybrid approach, (2) v3.0 scope footprint + Campaign Studio decision-gate boundary, (3) existing-org classification, (4) anti-feature confirmations (17 items), (5) Anthropic cache isolation approach (B recommended).
