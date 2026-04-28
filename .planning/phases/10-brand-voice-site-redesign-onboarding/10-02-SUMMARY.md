---
phase: 10-brand-voice-site-redesign-onboarding
plan: 02
subsystem: database
tags: [usage-metering, guardUsage, supabase, migration, api-routes, billing]

# Dependency graph
requires:
  - phase: 10-01
    provides: migration 35 staged (client_usage_metrics drop), subscription_history table live
  - phase: 09-03
    provides: guardUsage() in lib/usage/guard.ts (advisory-lock-hardened)
provides:
  - All 7 metered API routes on guardUsage() from lib/usage/guard.ts
  - client_usage_metrics table dropped from live DB (migration 35 applied)
  - increment_usage_metric RPC (both overloads) dropped from live DB
  - handlePaymentComplete() confirmed deleted (0 callers)
  - ERR-034 closed: content/generate uses getUserOrg() not from('users')
  - ERR-035 confirmed N/A: autopilot/generate already used getUserOrg()
affects:
  - 10-03 (brand voice): metered AI calls go through guardUsage
  - 10-04 (onboarding): provisioning step 01 no longer seeds client_usage_metrics

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "guardUsage() called BEFORE metered action; throws UsageCapExceededError on cap exceeded"
    - "email send routes guard amount=recipientCount to prevent partial-send quota drain"
    - "campaign send route guards AFTER recipient query but BEFORE Resend call (cheap-query-first)"

key-files:
  created:
    - __tests__/api/email-campaigns-send.usage-guard.test.ts
    - __tests__/unit/billing/subscription-history.test.ts
  modified:
    - supabase/migrations/35_drop_legacy_usage.sql (header updated: applied 2026-04-26)
    - __tests__/unit/lib/tier/feature-gate.test.ts (removed deleted function tests)
    - __tests__/integration/api/social/social-content-full.test.ts (429 test updated to guardUsage)
    - scripts/provisioning/steps/01-create-org.ts (removed client_usage_metrics INSERT)
    - scripts/check-tables.ts (removed client_usage_metrics from list)

key-decisions:
  - "All 7 routes were already migrated to guardUsage() in a prior session (Phase 10 Wave 1 prep work committed before plan 10-02 ran). Plan 10-02 became a verification + cleanup + migration-apply task."
  - "lib/usage/meter.ts checkUsage() is NOT the legacy function - it is the new read-only usage summary helper calling get_usage_summary RPC. It stays. Only the deleted feature-gate.ts checkUsage/incrementUsage were legacy."
  - "Migration 35 applied via management API (same PAT used in 10-01) — Supabase MCP unavailable this session."
  - "scripts/provisioning/steps/01-create-org.ts had a live INSERT to client_usage_metrics that would have failed silently after migration 35 drop. Removed as Rule 2 auto-fix."

patterns-established:
  - "Pre-flight grep before DB drop: grep -rn 'client_usage_metrics' lib/ app/ scripts/ to confirm zero live callsites before applying destructive migration"

# Metrics
duration: 55min
completed: 2026-04-26
---

# Phase 10 Plan 02: USAGE-13 Legacy Usage Surface Removal Summary

**migration 35 applied to live DB — client_usage_metrics table + increment_usage_metric RPC dropped; all 7 metered routes confirmed on guardUsage() with advisory-lock enforcement**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-04-26T19:40:00Z
- **Completed:** 2026-04-26T20:35:00Z
- **Tasks:** 2 (Task 1: callsite audit + test fixes; Task 2: migration apply)
- **Files modified:** 7 (+ 2 new test files)

## Accomplishments

- Confirmed all 7 API routes already migrated to guardUsage() in prior session — plan became a verification, cleanup, and apply task
- Removed last live callsite to client_usage_metrics (provisioning step 01 INSERT — would have silently failed post-migration)
- Fixed test suite: removed 6 tests for deleted feature-gate.ts functions, fixed 3 broken mock chains, updated 1 integration test to use guardUsage mock
- Applied migration 35 to live Supabase (psqfgzbjbgqrmjskdavs) — table and RPC confirmed dropped via management API query
- USAGE-13 fully closed: zero callsites in lib/, app/, scripts/ + DB objects gone

## Per-Route Migration Record

All 7 routes confirmed on guardUsage() (migrated before this plan executed):

| Route | Metric | Amount Strategy |
|-------|--------|-----------------|
| autopilot/chat | agent_invocations | qty: 1 |
| autopilot/generate | agent_invocations | qty: 1 |
| content/generate | ai_generations | qty: 1 |
| content/generate/social | ai_generations | qty: 1 |
| content/generate/email | ai_generations | qty: 1 |
| email/send | email_sends | qty: validRecipients.length |
| email/campaigns/[id]/send | email_sends | qty: activeRecipients.length |

## ERR Status

- **ERR-034:** CLOSED — content/generate confirmed using getUserOrg(), not from('users'). No `users` table query anywhere in the route.
- **ERR-035:** N/A (confirmed false alarm) — autopilot/generate was already on getUserOrg() + guardUsage() when inspected. The users-table bug never existed in this route.

## Task Commits

1. **Task 1: Remove live callsites + fix test suite** — `3582521e` (refactor(10-02))
2. **Task 2: Apply migration 35** — `c469ead9` (feat(10-02))

## Files Created/Modified

- `__tests__/api/email-campaigns-send.usage-guard.test.ts` — rewritten with proper chainable Supabase mock for campaign send flow
- `__tests__/unit/billing/subscription-history.test.ts` — fixed mock chain: `update().eq()` now properly chained
- `__tests__/unit/lib/tier/feature-gate.test.ts` — removed 6 dead tests for checkUsage/incrementUsage (functions deleted, tsc errors)
- `__tests__/integration/api/social/social-content-full.test.ts` — 429 test updated: mock guardUsage + UsageCapExceededError instead of legacy checkUsage
- `scripts/provisioning/steps/01-create-org.ts` — removed client_usage_metrics INSERT (4 lines)
- `scripts/check-tables.ts` — removed client_usage_metrics from table list
- `supabase/migrations/35_drop_legacy_usage.sql` — header updated from "DO NOT APPLY" to applied record

## Decisions Made

- lib/usage/meter.ts `checkUsage()` is the NEW read-only summary helper (calls `get_usage_summary` RPC) — kept. Only `feature-gate.ts` checkUsage/incrementUsage were deleted.
- Supabase MCP unavailable — used management API PAT (same pattern as 10-01).
- The migration's own DO $$ pre-flight block passed (client_usage_metrics had 0 rows updated in 24h — 0 total rows, confirmed by Phase 09 DIAGNOSTICS.md).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dead test blocks in feature-gate.test.ts causing tsc errors**
- **Found during:** Task 1 (pre-flight grep + tsc check)
- **Issue:** 6 test cases imported `checkUsage` and `incrementUsage` from `lib/tier/feature-gate` — functions that were deleted in USAGE-13 (prior session). TypeScript errored on non-existent exports.
- **Fix:** Removed the two describe blocks (`checkUsage()` and `incrementUsage()`) from the test file. Added comment noting USAGE-13 deletion.
- **Files modified:** `__tests__/unit/lib/tier/feature-gate.test.ts`
- **Committed in:** 3582521e (Task 1)

**2. [Rule 1 - Bug] social-content-full.test.ts 429 test used legacy checkUsage mock**
- **Found during:** Task 1 (tsc revealed remaining checkUsage import in integration test)
- **Issue:** Test at line 964 imported `checkUsage` from `feature-gate` and expected route to return 429 when it returned `allowed: false`. Route was migrated to `guardUsage` so this mock had no effect — test was a false positive (always passes but for wrong reason after migration).
- **Fix:** Updated mock to `vi.mock('@/lib/usage/guard', { guardUsage: vi.fn() })`, updated 429 test to throw `UsageCapExceededError` from guardUsage.
- **Files modified:** `__tests__/integration/api/social/social-content-full.test.ts`
- **Committed in:** 3582521e (Task 1)

**3. [Rule 2 - Missing Critical] Provisioning step 01 still inserting into client_usage_metrics**
- **Found during:** Task 1 (grep audit)
- **Issue:** `scripts/provisioning/steps/01-create-org.ts` line 117 had `supabase.from('client_usage_metrics').insert({...})`. After migration 35 drops the table, this would silently fail on every new org provision (supabase-js swallows the error with a `console.warn` path, but the INSERT would fail).
- **Fix:** Removed the 4-line block. New orgs no longer get a usage metrics row (usage_events table is the source of truth now).
- **Files modified:** `scripts/provisioning/steps/01-create-org.ts`
- **Committed in:** 3582521e (Task 1)

**4. [Rule 1 - Bug] subscription-history.test.ts and email-campaigns-send.usage-guard.test.ts had broken mock chains**
- **Found during:** Task 1 (test run)
- **Issue:** `mockUpdate.mockResolvedValue({error:null})` — calling `.eq()` on a resolved value throws. Both tests needed `mockUpdate.mockReturnValue({ eq: mockEq })`.
- **Fix:** Fixed mock chain in both files. subscription-history test: 2/2 pass. campaigns-send test: 2/2 pass.
- **Committed in:** 3582521e (Task 1)

---

**Total deviations:** 4 auto-fixed (2 Rule 1 bugs, 1 Rule 2 missing critical, 1 Rule 1 bug in tests)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

- Supabase MCP unavailable — management API used as in Phase 10-01. Migration applied via `scripts/migrations/phase-10/apply-migration.mjs`.

## Next Phase Readiness

- USAGE-13 fully closed. All metered routes on guardUsage(). Legacy DB surface gone.
- Migration 35 applied — no code anywhere references client_usage_metrics table or increment_usage_metric RPC.
- Wave 1 (10-01 + 10-02) complete. Ready for Wave 2 (10-03+) brand voice / site redesign.
- Pending soft todos (not blockers): `CRON_SECRET` in Vercel, PayFast sandbox runtime test.

---
*Phase: 10-brand-voice-site-redesign-onboarding*
*Completed: 2026-04-26*
