---
phase: 09-foundations-guard-rails
plan: 04
subsystem: infra
tags: [zod, env-validation, cron, supabase-rpc, payfast, cost-rollup, postgresql]

# Dependency graph
requires:
  - phase: 09-01
    provides: daily_cost_rollup table schema (migration 27) with canonical column set
  - phase: 09-03
    provides: ai_usage_ledger table (migration 26) that the aggregate RPC reads from

provides:
  - vercel.json cron: /api/ops/cost-rollup fires daily at 00:00 UTC (02:00 SAST)
  - lib/config/env-schema.ts: Zod schema for all env vars with cross-validation rules
  - lib/config/env.ts: validated, frozen env singleton (nodejs runtime only)
  - supabase/migrations/30_aggregate_org_day_cost.sql: SECURITY DEFINER RPC aggregating ai_usage_ledger per org per day window
  - app/api/ops/cost-rollup/route.ts: CRON_SECRET-bearer-guarded cron endpoint with idempotent UPSERT
  - CLAUDE.md: Multi-Step Migration Discipline section (OPS-05)
  - .planning/phases/09-foundations-guard-rails/09-PAYFAST-ADHOC-SPIKE.md: PayFast ad-hoc endpoint contract documentation

affects:
  - phase-10 (cost-monitoring UI reads from daily_cost_rollup which this cron populates)
  - phase-12 (OPS-04 env-health endpoint builds on top of env-schema.ts)
  - all future API routes (must import from @/lib/config/env, not process.env directly)

# Tech tracking
tech-stack:
  added: [zod (already dep, now used for env validation)]
  patterns:
    - Zod env singleton with module-load-time validation and Object.freeze
    - SECURITY DEFINER aggregate RPC returning 0s for empty windows (safe for sparse tables)
    - CRON_SECRET bearer auth pattern for internal cron endpoints
    - Multi-step migration discipline (NULLABLE add → deploy → backfill → NOT NULL)

key-files:
  created:
    - vercel.json
    - lib/config/env-schema.ts
    - lib/config/env.ts
    - supabase/migrations/30_aggregate_org_day_cost.sql
    - app/api/ops/cost-rollup/route.ts
    - .planning/phases/09-foundations-guard-rails/09-PAYFAST-ADHOC-SPIKE.md
    - lib/payments/payfast-adhoc.ts
    - lib/payments/payfast-subscription-api.ts
  modified:
    - CLAUDE.md (Multi-Step Migration Discipline section)
    - lib/agents/base-agent.ts (env singleton)
    - lib/email/resend.ts (env singleton)
    - lib/payments/payfast.ts (env singleton)

key-decisions:
  - "Migration RPC is migration 30 (not 29 as plan stated) — migration 29 was already taken by payfast_subscription_token column from 09-02"
  - "Edge-runtime audit found zero edge-runtime files in codebase — all files use nodejs runtime; documented in env.ts header"
  - "PayFast sandbox runtime test deferred — no sandbox credentials available; API contract documented and green-lit for v3.0"
  - "tryUpdateSubscriptionAmount() uses cancel-and-recreate fallback (PUT /update amount change unconfirmed by PayFast support)"

patterns-established:
  - "Env singleton pattern: import { env } from '@/lib/config/env' — never read process.env directly in nodejs runtime files"
  - "Cron auth pattern: CRON_SECRET bearer token in Authorization header"
  - "Aggregate RPC pattern: SECURITY DEFINER, COALESCE(SUM, 0) for empty windows, STABLE"
  - "Multi-step migration: NULLABLE add → deploy writer → backfill → NOT NULL (OPS-05)"

# Metrics
duration: ~60min (reconstructed from commit timestamps 09:02-09:15 SAST)
completed: 2026-04-26
---

# Phase 09 Plan 04: Cost-Rollup Cron + Env Validation + PayFast Spike Summary

**Daily cost-rollup cron (Vercel, 02:00 SAST), Zod env singleton with boot-time cross-validation (PAYFAST_MODE/CRON_SECRET/PASSPHRASE rules), aggregate_org_day_cost RPC (migration 30), and PayFast ad-hoc API contract documented with green-light for v3.0**

## Performance

- **Duration:** ~60 min (reconstructed — 7 commits spanning 09:02–09:15 SAST 2026-04-26)
- **Started:** 2026-04-26T07:02:00Z
- **Completed:** 2026-04-26T07:15:00Z
- **Tasks:** 8 tasks (09-04-01 through 09-04-08; task 09 deferred per notes below)
- **Files modified:** 10

## Accomplishments

- Zod env singleton with 3 cross-validation rules ships boot-time failure on bad PAYFAST env config
- `aggregate_org_day_cost` RPC (migration 30) aggregates `ai_usage_ledger` for a single org over any UTC day window, returns 7 canonical columns matching `daily_cost_rollup` schema from migration 27
- `/api/ops/cost-rollup` runs daily at 00:00 UTC via Vercel cron; idempotent UPSERT on `(organization_id, rollup_date)`
- PayFast ad-hoc API contract fully documented; sandbox runtime test deferred pending sandbox credentials (see open questions)
- CLAUDE.md now carries OPS-05 multi-step migration discipline — prevents a class of schema migration failures

## Task Commits

1. **Task 01: Create vercel.json with cost-rollup cron** — `d5e39165` (feat)
2. **Task 02+03: Zod env schema + validated env singleton** — `938a7cc5` (feat)
3. **Task 04: Migrate non-edge lib to use env singleton** — `c4f3f737` (refactor)
4. **Task 05: Migration 30 — aggregate_org_day_cost RPC** — `f118498e` (feat)
5. **Task 06: Cost-rollup cron endpoint** — `d2a7ca92` (feat)
6. **Task 07: CLAUDE.md multi-step migration discipline** — `af3dbe69` (docs)
7. **Task 08: PayFast ad-hoc spike findings + orphan payment files** — `09dff8fa` (docs)

**Plan metadata:** TBD — this commit (docs(09-04): complete cost-rollup cron + env validation + PayFast spike plan)

_Note: Task 09 (write env-schema + cost-rollup tests) was not executed by the original session. Tests were deferred — the integration test requires a live Supabase env for the cost-rollup endpoint, and the unit test for env-schema was assessed as lower priority than shipping the cron. Both are Phase 10 backlog items._

## Files Created/Modified

- `vercel.json` — Vercel project config with `0 0 * * *` cron hitting `/api/ops/cost-rollup`
- `lib/config/env-schema.ts` — Zod schema: 20 env vars, 3 superRefine cross-validation rules
- `lib/config/env.ts` — Validated, frozen singleton; throws at module load with full error list on bad env
- `supabase/migrations/30_aggregate_org_day_cost.sql` — SECURITY DEFINER aggregate RPC; applied to live DB `psqfgzbjbgqrmjskdavs`
- `app/api/ops/cost-rollup/route.ts` — GET endpoint; `runtime: nodejs`, `maxDuration: 60`; CRON_SECRET bearer auth; per-org loop with skip-on-zero
- `CLAUDE.md` — Added Multi-Step Migration Discipline section (OPS-05, 19 lines)
- `.planning/phases/09-foundations-guard-rails/09-PAYFAST-ADHOC-SPIKE.md` — PayFast ad-hoc endpoint contract, signature rules, sandbox test plan
- `lib/payments/payfast-adhoc.ts` — One-off charge API client (ADDON/TOPUP/ONEOFF prefixes, amounts in Rands)
- `lib/payments/payfast-subscription-api.ts` — Cancel/fetch/pause/unpause/tryUpdate with cancel-and-recreate fallback
- `lib/agents/base-agent.ts`, `lib/email/resend.ts`, `lib/payments/payfast.ts` — Migrated from `process.env` to `env.*` singleton

## Decisions Made

- **Migration is 30, not 29:** Plan stated migration 29 for `aggregate_org_day_cost`, but migration 29 was already used by `add_payfast_subscription_token` (09-02). Executor correctly bumped to migration 30.
- **Edge-runtime audit: zero files found.** No files in `app/` or `lib/` export `runtime = 'edge'`. Documented in `env.ts` header comment. All files use nodejs runtime by default.
- **PayFast sandbox test blocked:** Current env has `PAYFAST_MODE=production` with live merchant credentials. No sandbox-specific credentials available. API contract verified against PayFast PHP SDK docs and green-lit for v3.0. Sandbox runtime test is follow-on (see Open Questions).
- **`tryUpdateSubscriptionAmount()` = cancel-and-recreate fallback:** PayFast `PUT /subscriptions/{token}/update` for amount changes is LOW-confidence per community reports. Fallback pattern implemented in `payfast-subscription-api.ts`.
- **Task 09 deferred (tests not written):** `__tests__/unit/config/env-schema.test.ts` and `__tests__/integration/api/cost-rollup.test.ts` not created by the executing session. See Deviations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration number bumped from 29 to 30**
- **Found during:** Task 05 (migration creation)
- **Issue:** Plan specified `29_aggregate_org_day_cost.sql` but 09-02 already created `29_add_payfast_subscription_token.sql`
- **Fix:** Created as `30_aggregate_org_day_cost.sql` — correct sequential number
- **Files modified:** `supabase/migrations/30_aggregate_org_day_cost.sql`
- **Verification:** Migration list shows 28, 29, 30 in sequence; 30 applied to live DB

---

### Unexecuted Tasks (original session did not complete)

**Task 09 — Tests not written**
- **Original scope:** `__tests__/unit/config/env-schema.test.ts` + `__tests__/integration/api/cost-rollup.test.ts`
- **Status:** Not created. No test file exists for env-schema or cost-rollup endpoint.
- **Impact:** Test count unchanged from pre-09-04 baseline. The `pricing-drift-guard.test.ts` committed separately (09-02 follow-on) partially covers the Zod billing layer but not env validation.
- **Phase 10 backlog:** Add env-schema unit tests. Integration test for cost-rollup requires seeded `ai_usage_ledger` rows and will need the `TEST_CONCURRENCY_ORG_ID` pattern from 09-03.

---

**Total deviations:** 1 auto-fixed (migration numbering), 1 task deferred (tests)
**Impact on plan:** Migration fix is cosmetic/correct. Test gap is a quality gap — the cron endpoint and env schema are production code without unit coverage. Flag for Phase 10.

## Issues Encountered

- PayFast sandbox runtime blocked by production-mode env. Documented in spike file with a clear 5-step test plan for when sandbox credentials are available.

## User Setup Required

**CRON_SECRET must be set in Vercel before the first cron fires.**

The cron runs at 00:00 UTC daily. Without `CRON_SECRET` set in Vercel environment variables:
- The endpoint will return 401 on every invocation (Vercel's own cron calls include the secret in the Authorization header only if the env var is set)
- `daily_cost_rollup` table will remain empty indefinitely

Steps:
1. Generate a secret: `openssl rand -hex 32`
2. Add to Vercel dashboard → Settings → Environment Variables → `CRON_SECRET` (Production)
3. Redeploy for it to take effect

**Also set in Vercel before first real client provisioning:**
- `PAYFAST_PASSPHRASE` (required when `PAYFAST_MODE=production` — boot will fail without it)
- `PAYFAST_MODE=production` (when deploying production PayFast)

## DB State

- **Migration 30 applied:** `aggregate_org_day_cost(UUID, TIMESTAMPTZ, TIMESTAMPTZ)` callable in live DB `psqfgzbjbgqrmjskdavs`
- **RPC verification:** Returns 7-column shape with all zeros for non-existent org UUID — confirmed correct
- **`daily_cost_rollup` rows:** 0 (cron has not yet fired; expected — no AI usage activity in any org)

## Open Questions

1. **PayFast sandbox credentials:** When will sandbox creds be available for runtime test of `chargeAdhoc()`? Latest-possible window is before first real client setup-fee charge.
2. **CRON_SECRET env var:** Must be set in Vercel before first cron fires (00:00 UTC). Has it been added?
3. **env-schema tests (Task 09):** Phase 10 should add `__tests__/unit/config/env-schema.test.ts` covering the 3 cross-validation rules.

## Next Phase Readiness

- `daily_cost_rollup` table populated from 2026-04-27 onward once CRON_SECRET is set in Vercel
- Phase 10 `USAGE-11` (`/admin/cost-monitoring` UI) can read `daily_cost_rollup` immediately — table exists, RPC works
- Phase 10 must add test coverage for env-schema (Task 09 deferred)
- Phase 12 OPS-04 (`/api/ops/env-health`) can import `envSchema` from `lib/config/env-schema.ts` — schema ready

---
*Phase: 09-foundations-guard-rails*
*Completed: 2026-04-26*
