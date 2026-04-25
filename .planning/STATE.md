# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-24)

**Core value:** Complete multi-tenant B2B operating system for South African SMEs. Shared Supabase DB with RLS-based tenant isolation, wildcard subdomain routing, DB-backed module gating, automated provisioning.
**Current focus:** v3.0 Commercial Launch — Phase 09 (Foundations & Guard Rails)
**Current stats:** 217+ DB tables, 198+ API routes, 20+ UI modules, 6 AI agents, 30 N8N workflows (27 active), 583 tests (34 files). Build passing. tsc clean.

## Current Position

Milestone: v3.0 Commercial Launch (started 2026-04-24)
Phase: 09 of 12 (Foundations & Guard Rails) — **Wave 1 complete, Wave 2 next**
Plan: 1 of 5 complete (09-01 done). Plans 09-02 + 09-03 are Wave 2 (parallel).
Status: 09-01 executed. 6 migrations applied to live Supabase. Schema foundations in place.
Last activity: 2026-04-25 — Session 51: Plan 09-01 executed (7 tasks, 7 commits, 20 min)

Progress: [██░░░░░░░░] 20% (1/5 Phase 09 plans done)

## Performance Metrics

**Velocity (v1.0 baseline):**
- Total plans completed (v1.0): 19 plans across phases 01-07
- Partial Phase 08: 2 of 5 sub-phases complete

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 01-07 (v1.0) | 19/19 | Complete |
| 08 Meta | 2/5 | Partial (deferred) |
| **09 (v3.0)** | **1/5** | **In progress (Wave 1 done)** |
| 10 (v3.0) | 0/TBD | Not started |
| 11 (v3.0) | 0/TBD | Not started |
| 12 (v3.0) | 0/TBD | Not started |

*Updated after each plan completion*

## Accumulated Context

### Decisions (v3.0-specific, most recent first)

- **2026-04-25 (09-01 execution):** `user_role` enum = `{admin,manager,user,client}` — no `platform_admin`. RLS admin policies use `role = 'admin'`. `agent_sessions` was not in live DB (migration 05 not applied remotely) — recreated in migration 25 with CREATE IF NOT EXISTS. `client_usage_metrics` uses `posts_created/posts_published/ai_generations_count/metric_date` — NOT `posts_monthly/ai_generations_monthly/reset_date`. All 5 assumed column names absent — ERR-032 scope broader than expected.
- **2026-04-24 (Phase 09-12 scope):** PayFast billing = hybrid (variable-amount recurring + one-off ad-hoc). Anthropic cache isolation = org_id as first distinct system block + golden two-tenant CI test. Campaign Studio decision-gated at Phase 10 exit. Embedded Finance deferred to v3.1 with accountant review gate. Existing 8 orgs: audit + migrate paying, delete test (no grandfather).
- **2026-04-24 (research corrections):** `tenant_modules.limits` does NOT exist (plan limits live in `billing_plans.limits`). `agent_sessions.cost_usd` does NOT exist (needs ALTER migration). `PRICING_TIERS` is legacy constant — DB catalog `billing_plans` is source of truth. Usage metering is in dual-state (`client_usage_metrics` legacy + `usage_events` new) — Phase 09 must audit and consolidate.
- **2026-04-24 (risk gate):** 4 catastrophic pitfalls (PRICING_TIERS mutation, Anthropic cost runaway, cache key collision, tax-calc error) all have Phase 09 guards. Finance deferred to v3.1 addresses pitfall 6.
- Full decision log: `.planning/PROJECT.md` Current Milestone section.

### Pending Todos

- Execute Plan 09-02 (billing composition engine — Wave 2)
- Execute Plan 09-03 (usage enforcement + BaseAgent cost ledger — Wave 2, parallel with 09-02)
- Add RLS to `agent_sessions` table (created in migration 25 without policies — original schema had none)
- PayFast ad-hoc endpoint sandbox spike (1 day) — Phase 09 kickoff dependency
- Inventory existing 8 orgs (test/dormant/paying classification) before billing migration
- Resend domain warm-up status check + mail-tester baseline before Phase 10
- Google Search Console top-50 URL export before site redesign (Phase 10)

### Blockers/Concerns

- **Phase 08 Meta credentials still pending** (META_APP_ID/SECRET/BUSINESS_PORTFOLIO_ID from Chris) — does not block v3.0
- **WhatsApp Cloud API** (Elijah Incident Intake inactive) — does not block v3.0
- **Domain DNS:** apex A record wrong, www hijacked by Hostinger CDN — Phase 10 site redesign should coordinate DNS fix
- **Restaurant module `restaurant_orders` table existence** — audit required in Phase 11 before committing restaurant finance adapter (finance is v3.1 anyway, but flagged)

## Session Continuity

Last session: 2026-04-25 — Session 51: Plan 09-01 executed (6 migrations applied, audit script done)

### Session 50 Summary (2026-04-25) — v3.0 Milestone Initialization + Phase 09 Planning
**What was done:**
1. Strategic pivot conversation: pricing model rebuilt (R599 Core + R1,199 Vertical + add-ons + R1,499 setup), Easy/Advanced UX pattern locked (per-page toggle), VDJ accounting reframed as embedded knowledge (not integration), competitive positioning vs Holo AI established
2. Initialized v3.0 Commercial Launch milestone via `/gsd:new-milestone`:
   - Updated PROJECT.md with v3.0 milestone section (10 target capabilities)
   - Created MILESTONES.md ledger (phase-numbering history)
   - Reset STATE.md for new milestone
   - Created `lib/finance/knowledge/` template for VDJ knowledge dump (sa-vat.md template + README)
   - Commit f74c584f
3. Spawned 4 parallel gsd-project-researcher agents (stack/features/architecture/pitfalls):
   - STACK.md — Haiku 4.5 default, grammy/Upstash/fal.ai stack, ZAR cost estimates
   - FEATURES.md — 22 table-stakes / 15 differentiators / 17 anti-features
   - ARCHITECTURE.md — 4 critical context corrections (`tenant_modules.limits` doesn't exist, `agent_sessions.cost_usd` missing, etc.)
   - PITFALLS.md — 25 pitfalls (15 critical, 6 moderate, 4 minor)
4. Synthesized research into SUMMARY.md (commit e6b5eec6) — 5 cross-cutting decisions surfaced
5. Chris locked all 5 cross-cutting decisions: hybrid PayFast, scope reality (~8-11 weeks solo), no existing paying orgs, 17 anti-features confirmed, Anthropic Option B cache isolation
6. Generated REQUIREMENTS.md — 53 REQ-IDs across 8 categories (commit 86cb6347)
7. Spawned gsd-roadmapper — created ROADMAP.md with 4 phases (09-12), all reqs mapped, success criteria derived (commit bf73271e)
8. Chris approved roadmap
9. Ran `/gsd:plan-phase 09`:
   - Spawned gsd-phase-researcher → 09-RESEARCH.md (60KB; surfaced 4 latent bugs)
   - Spawned gsd-planner → wrote 09-01 + 09-02; hit usage limit mid-execution
   - Wrote 09-03, 09-04, 09-05 directly to match planner format
   - Iteration 1: gsd-plan-checker found 14 issues (4 blocker, 7 high, 3 medium)
   - Revised 09-02 (typo), 09-03 (ledger columns / plan_id / RPC verification / system param widening), 09-04 (drop env-health, schema alignment, aggregate RPC, plan_id, edge-runtime audit)
   - Iteration 2: PASSED with 1 trivial inline fix
   - Commit 05991d93

**Latent bugs surfaced and catalogued (ERR-029..ERR-032):**
- ERR-029: BaseAgent default = Sonnet (silent cost drain on all 6 production agents) → Phase 09 09-03 fix
- ERR-030: PayFast webhook stores pf_payment_id as subscription_token (prevents amendment via API) → Phase 09 09-02 fix + 09-05 audit
- ERR-031: record_usage_event SELECT-SUM-then-INSERT race under READ COMMITTED → Phase 09 09-03 advisory-lock migration 28
- ERR-032: PayFast webhook writes `monthly_posts_used`/`monthly_ai_generations_used` (likely silent no-op) — different mismatch than ERR-001 → Phase 09 09-05 diagnostic audit, Phase 10 USAGE-13 cleanup

**Key decisions locked:**
- PayFast hybrid billing (recurring variable-amount + one-off ad-hoc); 1-day sandbox spike in Phase 09 to verify ad-hoc endpoint
- Haiku 4.5 default model across all 6 BaseAgent subclasses (~98.8% gross margin on AI ops at R599 Core)
- Anthropic cache isolation Option B: `org_id` as first distinct system block + golden two-tenant CI test
- All 8 existing orgs: test/dormant — free to migrate/delete (no grandfather logic needed)
- Campaign Studio decision-gated at Phase 10 exit (CAMP-01..08 conditional)
- Embedded Finance deferred to v3.1 with accountant review gate on first 3 pilot tenants
- 17 anti-features confirmed (no double-entry accounting, no native mobile, no video gen, etc.)

**Files committed (5 commits this session):**
- f74c584f: docs: start milestone v3.0 Commercial Launch
- e6b5eec6: docs: v3.0 research synthesis (stack/features/architecture/pitfalls)
- 86cb6347: docs: define milestone v3.0 requirements (53 REQ-IDs)
- bf73271e: docs: create milestone v3.0 roadmap (phases 09-12)
- 05991d93: docs: Phase 09 plans (research + 5 plans, verified)

**No code changes this session.** Pure planning + documentation. 583 existing tests still pass (untouched). Build status unchanged.

### Next Session: Execute Phase 09

Resume with:
1. **Open a fresh session** (context window reset recommended given session-50 depth)
2. Run `/gsd:execute-phase 09` — 5 plans across 3 waves, ~6-8 dev-days estimated
3. Pre-flight checks (cheap, do before execution):
   - `CRON_SECRET` env var present in Vercel? (If not, 09-04 cost-rollup auth will fail in prod)
   - PayFast sandbox credentials accessible? (Needed for 09-04 ad-hoc spike, 1-day max)
   - `TELEGRAM_OPS_CHAT_ID` set if you want operator alerts on saga failures (09-02)
4. Wave 1 (09-01): DB schema migrations 22-27 + audit SQL — apply via Supabase MCP
5. Wave 2 (09-02 + 09-03 in parallel): Billing composition engine + Usage enforcement / BaseAgent rewrite
6. Wave 3 (09-04 + 09-05 in parallel): Cost-rollup cron + env validation + PayFast spike + diagnostics

**Phase 09 success criteria** (must all be TRUE before phase closes):
1. New user subscribes to Core+Accommodation via composition API → PayFast sandbox charges composed amount → snapshot captures plan
2. Abusive tenant cannot exceed per-tier Anthropic ceiling; 50 concurrent cap-boundary requests = zero leakage
3. PayFast ITN branches by m_payment_id prefix and validates against snapshot
4. Startup Zod assertion fails boot on PAYFAST_MODE=production without passphrase
5. client_usage_metrics dual-state audit complete (no migration yet — Phase 10 cleanup)
6. Zero end-user UI touched (no /dashboard route changes)

### Carry-forward (deferred, not blockers for v3.0)

- Merge `restaurant-sop-upgrade` → `main` (launch banner, Session 49 work)
- DNS fix: apex A → `76.76.21.21`, remove Horizons CDN from www
- WhatsApp Cloud API config (Phase 08.1)
- Meta OAuth credentials (Phase 08.1)
- Lookout Deck demo seed data
- VDJ knowledge dump into `lib/finance/knowledge/` (only needed by v3.1)
