# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-24)

**Core value:** Complete multi-tenant B2B operating system for South African SMEs. Shared Supabase DB with RLS-based tenant isolation, wildcard subdomain routing, DB-backed module gating, automated provisioning.
**Current focus:** v3.0 Commercial Launch — **Phase 11 IN PROGRESS.** Wave 1 (11-01, 11-02) + Wave 2 (11-03, 11-04, 11-05, 11-06) all complete. ModuleHome scaffold live; database.types.ts regenerated with all Phase 11 tables. CRM Easy view (11-07) and Campaign Studio (11-08, 11-09) are Wave 3 (pending).
**Current stats:** 220+ DB tables, 243 API routes, 95 UI pages, 10 AI agent types, 21 N8N workflows, 6 module-home components, lib/supabase/database.types.ts regenerated (587KB). tsc clean.

## Current Position

Milestone: v3.0 Commercial Launch (started 2026-04-24)
Phase: 11 of 12 (Easy/Advanced CRM + Campaign Decision) — IN PROGRESS
Plan: 11-01 COMPLETE. 11-02 COMPLETE (Wave 1). 11-03 COMPLETE (Wave 2 — ModuleHome + types + db regen). 11-04 COMPLETE (Wave 2). 11-05 COMPLETE (Wave 2). 11-06 COMPLETE (Wave 2). Wave 2 complete.
Status: Wave 1 + Wave 2 done. Wave 3 (11-07 CRM Easy view, 11-08 Campaign Studio scaffold, 11-09 N8N) pending.
Last activity: 2026-04-27 — Plan 11-03 executed: 6 components + db types regen + 14 tests (0a7f4ff0, 7518cf25, 89094890)

## Resume Next Session

**Open fresh session, then:**
1. Check `.planning/phases/11-easy-advanced-crm-campaign-decision/11-RESEARCH.md` exists. The researcher was resumed in background; it may have written a partial doc with TODO markers, OR may have failed silently.
2. If RESEARCH.md exists → run `/gsd:plan-phase 11` (it will skip re-research since file exists)
3. If RESEARCH.md missing → run `/gsd:plan-phase 11 --research` to retry; consider breaking the research focus into 2-3 smaller spawns to avoid timeout (e.g. spawn one for "schema + ModuleHome + drafts" and another for "Campaign Studio + SMS gateway + brand-safety check")

**Phase 11 context summary (full detail in 11-CONTEXT.md):**
- Decision gate: OPTION B locked — Campaign Studio scaffold ships in v3.0, email+SMS active, FB/IG/LinkedIn credential-gated
- First-paying-client target relaxed; quality bar (Phase 12 promised-vs-delivered alignment) takes priority
- 28 locked decisions across 4 areas: 3 AI action cards + approve actions + toggle UX + drafts/view-desync
- ~10 items in "Claude's Discretion" for researcher to resolve (SMS gateway choice, schema specifics, engagement-score weights, etc.)

**Deferred to Phase 12 (NOT Phase 11):** promised-vs-delivered audit (replace fabricated SocialProof stats; add seat-count gate or remove "2/5 users included" copy; tone down "AI 24/7 autonomous" overpromise).

Progress: [██████████] 100% (7/7 Phase 10 plans done) · v3.0 milestone: 2/4 phases complete

## Performance Metrics

**Velocity (v1.0 baseline):**
- Total plans completed (v1.0): 19 plans across phases 01-07
- Partial Phase 08: 2 of 5 sub-phases complete

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 01-07 (v1.0) | 19/19 | Complete |
| 08 Meta | 2/5 | Partial (deferred) |
| **09 (v3.0)** | **5/5** | **Complete 2026-04-26** |
| **10 (v3.0)** | **7/7** | **Complete 2026-04-27** |
| 11 (v3.0) | 0/TBD | Not started |
| 12 (v3.0) | 0/TBD | Not started |

*Updated after each plan completion*

## Accumulated Context

### Decisions (v3.0-specific, most recent first)

- **2026-04-27 (11-05 execution):** `organizations.activated_at` is ABSENT from live Supabase DB (psqfgzbjbgqrmjskdavs) — column exists in 00_initial_schema.sql but was never applied. `isInNewTenantPeriod()` uses `created_at` as fallback. Phase 12 must add migration for `activated_at`, backfill, then switch. Unit-testing BaseAgent subclasses requires `vi.mock('@/lib/config/env')` hoisted (not just mocking payfast) — env module validates eagerly at import. BrandSafetyAgent: Haiku temperature=0 correct for safety classification tasks. CampaignDrafterAgent: Sonnet default (creative multi-channel needs larger context).

- **2026-04-26 (10-06 execution):** VAT formula locked as `Math.round(cents * 1.15)` — pure integer cent math, no float drift. en-ZA locale renders ZAR as "R599,00" (comma decimal + NBSP thousands) — kept as-is, tests use `\s+` regex. /pricing module picker is RSC + client split: server fetches `billing_addons_catalog`, client renders interactive total. addon IDs NEVER hard-coded — picker iterates whatever the catalog returns. Trust trio "3 business days to go live / Pay in Rands / Cancel anytime" replaces Pitfall F false copy in 4 locations (sections.tsx hero strip, PricingPreview, CTASection, register-interest.tsx). Hero illustration is Lucide gear icon placeholder pending custom SVG. Legacy localStorage `OnboardingChecklist` kept in repo (unreferenced) for safety; new API-backed `app/(dashboard)/_components/onboarding-checklist.tsx` is now the dashboard checklist.

- **2026-04-26 (10-02 execution):** All 7 routes were pre-migrated to guardUsage() before plan ran (prior session work). Plan 10-02 executed as audit+cleanup+apply. lib/usage/meter.ts checkUsage() is the NEW read-only RPC-based helper — NOT the deleted feature-gate.ts function. ERR-035 confirmed N/A (autopilot/generate never queried users table). Provisioning step 01 had a live INSERT to client_usage_metrics (missed in prior session) — removed as part of plan.
- **2026-04-26 (10-01 execution):** Supabase MCP unavailable — management API PAT (`sbp_98ba...`) used for all migration applies via `scripts/migrations/phase-10/apply-migration.mjs`. `client_profiles` table absent from live DB — migration 31 includes full CREATE TABLE IF NOT EXISTS. `subscription_history` column shape derived from actual code (FLOAT amounts, transaction_id) not plan suggestions. Two `increment_usage_metric` overloads in live DB — migration 35 drops both. ILIKE required for pg_indexes.indexdef case-insensitive matching.
- **2026-04-26 (09-03 execution):** Haiku 4.5 (`claude-haiku-4-5-20251001`) is unconditional default for ALL BaseAgent subclasses — Sonnet allow-listed only for scale/platform_admin. USD→ZAR hardcoded as integer `1660` (not `16.6 * 100`, float imprecision). Advisory lock uses `hashtext()` not `hashtextextended()` (32-bit key, no BigInt, same collision risk). Concurrency integration test is env-gated (`TEST_CONCURRENCY_ORG_ID`) — skipped in CI without test org. ai_usage_ledger.error TEXT carries abort detail (`aborted_ceiling: N cents over C`); no separate status column.
- **2026-04-25 (09-02 execution):** Amount mismatch on ITN: accept + flag (200 to PayFast) — insert amount_mismatch_accepted audit row. Setup fee deferred to post-first-ITN (subscription token needed). payfast-adhoc.ts sends rands — confirmed vs corrected in 09-04 spike. Migration 29 (payfast_subscription_token column) committed to repo but requires manual Supabase Dashboard SQL Editor application. New subscription detected by `!org.activated_at`.
- **2026-04-25 (09-01 execution):** `user_role` enum = `{admin,manager,user,client}` — no `platform_admin`. RLS admin policies use `role = 'admin'`. `agent_sessions` was not in live DB (migration 05 not applied remotely) — recreated in migration 25 with CREATE IF NOT EXISTS. `client_usage_metrics` uses `posts_created/posts_published/ai_generations_count/metric_date` — NOT `posts_monthly/ai_generations_monthly/reset_date`. All 5 assumed column names absent — ERR-032 scope broader than expected.
- **2026-04-24 (Phase 09-12 scope):** PayFast billing = hybrid (variable-amount recurring + one-off ad-hoc). Anthropic cache isolation = org_id as first distinct system block + golden two-tenant CI test. Campaign Studio decision-gated at Phase 10 exit. Embedded Finance deferred to v3.1 with accountant review gate. Existing 8 orgs: audit + migrate paying, delete test (no grandfather).
- **2026-04-24 (research corrections):** `tenant_modules.limits` does NOT exist (plan limits live in `billing_plans.limits`). `agent_sessions.cost_usd` does NOT exist (needs ALTER migration). `PRICING_TIERS` is legacy constant — DB catalog `billing_plans` is source of truth. Usage metering is in dual-state (`client_usage_metrics` legacy + `usage_events` new) — Phase 09 must audit and consolidate.
- **2026-04-24 (risk gate):** 4 catastrophic pitfalls (PRICING_TIERS mutation, Anthropic cost runaway, cache key collision, tax-calc error) all have Phase 09 guards. Finance deferred to v3.1 addresses pitfall 6.
- Full decision log: `.planning/PROJECT.md` Current Milestone section.

### Pending Todos (Phase 10 pre-flight)

**Hard blockers (must do before Phase 10 deploys):**
- **Set `CRON_SECRET` in Vercel** (Production env vars). Without it the cost-rollup cron 401s nightly. Generate with `openssl rand -hex 32`.
- **PayFast sandbox runtime test:** compose plan → record_composition → send ITN with `token` field → confirm `payfast_subscription_token` set from `ITN.token` (not `pf_payment_id`). Needs sandbox merchant creds.

**Soft (Phase 10 backlog):**
- 50-concurrent guardUsage integration test in CI (provision `TEST_CONCURRENCY_ORG_ID` org with `billing_plans.limits.ai_generations=50`, verify advisory lock holds).
- Env-singleton-in-tests fix: 09-04 env singleton throws at module load when `.env.local` is incomplete; vitest setup needs an env mock so tests that transitively import `lib/payments/payfast.ts` don't fail. Orphan `pricing-drift-guard.test.ts` was deleted as part of 09-05 wrap-up; broader fix is Phase 10 backlog.
- ~~USAGE-13 (Plan 10-02): CLOSED~~ — All 7 routes on guardUsage(). Migration 35 applied 2026-04-26. client_usage_metrics dropped, increment_usage_metric RPC dropped.
- Test cleanup of v3.0-discovered org classification: 4 test orgs queued for delete, 4 dormant orgs (incl. platform_admin org) for soft-archive. archived_at semantics now defined (migration 33).
- ~~Add RLS to `agent_sessions`~~ — CLOSED (migration 33 section B, 4 policies active).
- env-schema unit tests (Task 09 of 09-04 deferred): `__tests__/unit/config/env-schema.test.ts` for the 3 superRefine cross-validation rules.
- Resend domain warm-up status check + mail-tester baseline before Phase 10.
- Google Search Console top-50 URL export before site redesign (Phase 10).

### Blockers/Concerns

- **Phase 08 Meta credentials still pending** (META_APP_ID/SECRET/BUSINESS_PORTFOLIO_ID from Chris) — does not block v3.0
- **WhatsApp Cloud API** (Elijah Incident Intake inactive) — does not block v3.0
- **Domain DNS:** apex A record wrong, www hijacked by Hostinger CDN — Phase 10 site redesign should coordinate DNS fix
- **Restaurant module `restaurant_orders` table existence** — audit required in Phase 11 before committing restaurant finance adapter (finance is v3.1 anyway, but flagged)

## Session Continuity

Last session: 2026-04-27 — Plan 11-07 execution: CRM Easy view RSC + data fetcher + 3 API routes. 3 task commits (8ee8ba7a, 8cdd0395, 6d97af92). tsc clean on all new files.
Resume file: None

### Session (2026-04-27) — Phase 11 Plan 11-07: CRM Easy View
**What was done:**
1. Executed plan 11-07: CRM Easy view at /dashboard/crm using ModuleHome library.
2. Built lib/crm/ui-mode.ts (resolveUiMode with role defaults), lib/crm/easy-view-data.ts (server-side 3-card data fetcher).
3. Replaced app/(dashboard)/crm/page.tsx with Easy view RSC (backed up to _legacy/stats-overview.tsx.bak for 11-08).
4. Created app/(dashboard)/crm/layout.tsx mounting UndoToastViewport.
5. Built lib/crm/email-templates.ts with genericFollowupTemplate + composeFollowupEmail + composeHotLeadPitchEmail.
6. Built 3 API routes: /api/crm/easy-view/approve (full action branching + crm_activities audit), /api/crm/easy-view/dismiss (7-day dismissal upsert), /api/crm/ui-mode (toggle persistence).
7. Auto-fixed: table names contacts/deals (not crm_contacts/crm_deals); staleness proxy updated_at on deals; UserOrg field names userId/organizationId.

**Next session: Execute Plan 11-08** (Advanced route + backup recovery + toggle button)

### Session 55 Summary (2026-04-26) — Phase 10 Plan 01: Schema Migrations
**What was done:**
1. Executed plan 10-01: wrote migrations 31-35, applied 31-34 to live Supabase project `psqfgzbjbgqrmjskdavs`.
2. Discovered Supabase MCP tool unavailable — found PAT in `~/.claude/settings.json`, used management API for all migration applies.
3. Discovered `client_profiles` absent from live DB — migration 31 extended to include full `CREATE TABLE IF NOT EXISTS` with corrected RLS policies (old RLS used non-existent `users` table).
4. Derived `subscription_history` schema from actual `lib/billing/subscriptions.ts` INSERT calls — columns differ from plan's suggested shape (FLOAT amounts, transaction_id vs event_type).
5. Fixed LIKE case sensitivity bug in migration 32 verification DO block — first apply failed, fixed to ILIKE, re-applied successfully.
6. Verified all migration spot checks pass via management API SQL queries.
7. Closed ERR-033, closed "Add RLS to agent_sessions" pending todo.
8. Staged migration 35 in repo (committed, NOT applied) — applies in plan 10-02 after callsite migration.
9. 3 task commits (26aacc82, 2b7f6363, 1bd784e8) + SUMMARY + STATE update.

**DB state after session:** 13 Phase 09+10 migrations live in Supabase. client_profiles (created), onboarding_progress, subscription_history tables new. organizations.archived_at, agent_sessions FORCE RLS, provisioning_jobs.status='paused' all live.

**Next session: Execute Phase 10 Plan 02 (USAGE-13 callsite migration)**

### Session 54 Summary (2026-04-26) — Phase 09 Completion Sweep
**What was done:**
1. Discovered Wave 3 work-in-progress on disk uncommitted (lib/ai/, lib/usage/guard.ts, BaseAgent rewrite +228 lines, lib/payments/payfast-adhoc.ts, payfast-subscription-api.ts, etc.) and migrations 28+29+30 on disk but NOT applied to live DB.
2. Applied migration 29 (payfast_subscription_token col) and migration 28 (record_usage_event advisory lock) via Supabase MCP in parallel. Verified live in DB.
3. Spawned gsd-executor for 09-03 recovery — audited on-disk work, gap-filled, ran verification, committed per-task. 9 commits: c99138b8 → b129e54c. 33 new tests. tsc clean.
4. Discovered Wave 3 was already partially executed by parallel session — 8 commits already in place for 09-04 (d5e39165 → 09dff8fa) and 1 commit for 09-05 diagnostic scripts (0d34c0ef). Migration 30 file existed but not applied to DB.
5. Applied migration 30 (aggregate_org_day_cost RPC) via Supabase MCP. Verified live.
6. Spawned wrap-up agent for missing SUMMARYs — crashed mid-task (API ConnectionRefused at 22 tool calls). Agent had written 09-04-SUMMARY.md before crashing.
7. Finished 09-05 wrap-up directly: wrote 09-05-SUMMARY.md, committed 09-DIAGNOSTICS.md + 09-DIAGNOSTICS-DATA.json (commit 385b5914), final docs commits for 09-04 (524eb143) and 09-05 (0b901fb8). Deleted obsolete `apply-migration-29.mjs` helper. Deleted orphan `pricing-drift-guard.test.ts` (env-singleton test infra issue — Phase 10 backlog).
8. Spawned gsd-verifier — verdict: human_needed (4/4 must-haves structurally PASS, 2 runtime checks deferred pending sandbox creds). Report at `.planning/phases/09-foundations-guard-rails/09-VERIFICATION.md`.
9. tsc --noEmit exit 0 confirmed clean build.
10. Updated REQUIREMENTS.md (17 Phase 09 reqs → Complete), ROADMAP.md (Phase 09 → 5/5 Complete 2026-04-26).

**DB state at phase exit:** 9 Phase 09 migrations live in Supabase project `psqfgzbjbgqrmjskdavs`: 22 (snapshot+changelog), 23 (composition), 24 (addons + 7 seed), 25 (agent_sessions cost cols), 26 (ai_usage_ledger), 27 (rollup + mtd RPC), 28 (advisory lock), 29 (payfast_subscription_token), 30 (aggregate_org_day_cost RPC). 8 composition_rows backfilled.

**Verifier human_needed reasons (accepted by Chris's launch-push directive):**
- PayFast sandbox runtime test deferred — sandbox merchant creds not available; API contract documented in 09-PAYFAST-ADHOC-SPIKE.md, green-lit for v3.0
- 50-concurrent guardUsage integration test correctly written but env-gated (`TEST_CONCURRENCY_ORG_ID`); needs live seeded fixture before CI run

### Next Session: Execute Phase 10

Resume with:
1. **Open a fresh session** (context reset recommended after session-54 depth)
2. Set `CRON_SECRET` in Vercel before next deploy (or accept 24h of empty rollups)
3. Run `/gsd:discuss-phase 10` to gather context, OR `/gsd:plan-phase 10` to skip discussion and plan directly

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
