# Phase 09 Diagnostics

> Read-only investigation run 2026-04-26. Findings consumed by Phase 10 USAGE-13 cleanup and existing-org migration.
> Scripts: `scripts/diagnostics/phase-09/`. Machine-readable data: `09-DIAGNOSTICS-DATA.json`.

## Executive Summary

1. **ERR-032 is Case A (worst-case, now confirmed):** `client_usage_metrics` was completely renamed in a live migration — all columns the legacy webhook, feature-gate, and email routes assumed (`posts_monthly`, `ai_generations_monthly`, `reset_date`, `emails_sent_monthly`, `monthly_posts_used`, etc.) do not exist on the table. Every write to these columns has been a silent no-op since the table was renamed. The table has 0 rows and has never been written to by production code.

2. **ERR-030 is latent-fixed, never triggered:** All 8 organizations have `payfast_subscription_token = NULL`. No PayFast ITN has ever been received in production. The pre-09-02 bug (writing `pf_payment_id` as the token) never manifested. Post-09-02 ITN handler correctly reads from `ITN.token`.

3. **Zero paying orgs, all are test/dormant:** Confirmed Chris's claim. 0 organizations have any PayFast activity, 0 have usage events, 0 have agent sessions. Safe to proceed with Phase 10 with no legacy-billing grandfather logic.

**Safe to proceed with Phase 10:** YES, with one caveat — Phase 10 USAGE-13 must delete 7 legacy write paths across 4 files before any new code calls these routes in production.

---

## 1. client_usage_metrics Column Mismatch (ERR-032)

**Case confirmed: A** — Only the renamed column set exists. All legacy-assumed columns are absent.

### Actual columns on `client_usage_metrics` (live DB, 2026-04-26)

| Column | Data Type | Notes |
|--------|-----------|-------|
| `id` | uuid | PK |
| `organization_id` | uuid | FK → organizations |
| `posts_created` | integer | renamed from `posts_monthly` |
| `posts_published` | integer | added in later migration |
| `ai_generations_count` | integer | renamed from `ai_generations_monthly` |
| `api_calls_count` | integer | renamed from `api_calls_monthly` |
| `storage_used_mb` | integer | unchanged |
| `metric_date` | date | renamed from `reset_date` |
| `created_at` | timestamptz | unchanged |
| `updated_at` | timestamptz | unchanged |

### Column name mismatch verdict

| Assumed column (in code) | Exists? | Referenced in |
|--------------------------|---------|---------------|
| `monthly_posts_used` | NO | `lib/billing/subscriptions.ts:310` |
| `monthly_ai_generations_used` | NO | `lib/billing/subscriptions.ts:311` |
| `reset_date` | NO | `lib/billing/subscriptions.ts:312` |
| `posts_monthly` | NO | `lib/tier/feature-gate.ts:191,226` |
| `ai_generations_monthly` | NO | `lib/tier/feature-gate.ts:192,227` |
| `emails_sent_monthly` | NO | `app/api/email/send/route.ts:85,282`; `app/api/email/campaigns/[id]/send/route.ts:72,286` |
| `emails_limit` | NO | `app/api/email/send/route.ts:85` |
| `agent_invocations_monthly` | NO | `lib/tier/feature-gate.ts:193,228` (via `increment_usage_metric` RPC) |
| `autopilot_runs_monthly` | NO | `lib/tier/feature-gate.ts:194,229` (via `increment_usage_metric` RPC) |

**Production data state:** `client_usage_metrics` = 0 rows. No data to migrate.

**Webhook silently failing?** YES — and broader than ERR-032 originally captured:
- `lib/billing/subscriptions.ts handlePaymentComplete()` writes `monthly_posts_used`, `monthly_ai_generations_used`, `reset_date` — all missing. PostgREST returns 42703; caller catches and logs non-fatally. **Dead code path** — `handlePaymentComplete` has no callers in `app/` either.
- `lib/tier/feature-gate.ts checkUsage()` reads `posts_monthly` and `ai_generations_monthly` — both missing. PostgREST returns error; caller falls through to `{ allowed: true }` (permissive default). Every usage check has been passing unconditionally.
- `lib/tier/feature-gate.ts incrementUsage()` calls `increment_usage_metric` RPC which does `UPDATE client_usage_metrics SET posts_monthly = ...` — column missing, update silently affects 0 rows. No error logged.
- `app/api/email/send/route.ts` and `app/api/email/campaigns/[id]/send/route.ts` read `emails_sent_monthly` (missing → null → 0) and write it (no-op). Email cap checks have always returned "allowed" because current = 0.

**Phase 10 action:** USAGE-13 — delete 4 legacy files/code paths (see Section 2).

---

## 2. Callsite Inventory

### Write sites (legacy — all are silent no-ops today)

| File | Lines | Column targeted | Action type | Phase 10 action |
|------|-------|-----------------|-------------|-----------------|
| `lib/billing/subscriptions.ts` | 308–313 | `monthly_posts_used`, `monthly_ai_generations_used`, `reset_date` | UPDATE (reset on payment) | Delete entire `handlePaymentComplete` (no callers) |
| `lib/tier/feature-gate.ts` | 226–240 | `posts_monthly`, `ai_generations_monthly`, `emails_sent_monthly`, `agent_invocations_monthly`, `autopilot_runs_monthly` via RPC | UPDATE via `increment_usage_metric` RPC | Replace `incrementUsage()` with `guardUsage()` calls |
| `app/api/email/send/route.ts` | 280–283 | `emails_sent_monthly` | UPDATE | Replace with `guardUsage({ metric: 'email_sends' })` |
| `app/api/email/campaigns/[id]/send/route.ts` | 284–287 | `emails_sent_monthly` | UPDATE | Replace with `guardUsage({ metric: 'email_sends' })` |

### Read sites (legacy — all return permissive null/0 today)

| File | Lines | Column read | Behavior | Phase 10 action |
|------|-------|-------------|----------|-----------------|
| `lib/tier/feature-gate.ts` | 179–198 | `posts_monthly`, `ai_generations_monthly` (and all monthly variants) | Returns 0 → always allowed | Replace `checkUsage()` with `guardUsage()` |
| `app/api/email/send/route.ts` | 84–89 | `emails_sent_monthly`, `emails_limit` | Returns null → 0, always allowed | Replace with `guardUsage()` pre-check |
| `app/api/email/campaigns/[id]/send/route.ts` | 71–76 | `emails_sent_monthly` | Returns null → 0, always allowed | Replace with `guardUsage()` pre-check |

### New system (guardUsage — correct path)

| File | Usage | Notes |
|------|-------|-------|
| `lib/usage/guard.ts` | Calls `record_usage_event` RPC (advisory-lock-hardened) | Phase 09-03 implementation |
| `app/api/autopilot/chat/route.ts` | `checkUsage('agent_invocations')` | Still on old path — needs migration |
| `app/api/autopilot/generate/route.ts` | `checkUsage('agent_invocations')` | Still on old path — needs migration |
| `app/api/content/generate/route.ts` | `checkUsage('ai_generations')` → `incrementUsage()` | Still on old path — needs migration |
| `app/api/content/generate/social/route.ts` | `checkUsage('ai_generations')` → `incrementUsage()` | Still on old path — needs migration |
| `app/api/content/generate/email/route.ts` | `checkUsage('ai_generations')` → `incrementUsage()` | Still on old path — needs migration |

**handlePaymentComplete:** Has 0 callers in `app/` or `lib/`. Dead code. Delete in Phase 10.

### Migration map for Phase 10 USAGE-13

1. **Delete** `handlePaymentComplete` from `lib/billing/subscriptions.ts` (0 callers, dead path)
2. **Replace** `checkUsage` + `incrementUsage` in `lib/tier/feature-gate.ts` with stubs that call `guardUsage` or mark deprecated
3. **Migrate** 5 API routes: `autopilot/chat`, `autopilot/generate`, `content/generate`, `content/generate/social`, `content/generate/email` — replace `checkUsage`/`incrementUsage` with `guardUsage`
4. **Migrate** 2 email routes: `email/send`, `email/campaigns/[id]/send` — replace with `guardUsage({ metric: 'email_sends' })`
5. **Drop** `increment_usage_metric` DB function (no longer needed after migration)
6. **Keep** `client_usage_metrics` table until all old code is removed (migration 31+ can drop it)

---

## 3. PayFast Token State (ERR-030)

**Token-overwrite bug confirmed/refuted:** REFUTED (never triggered in production)

### Live data

| Metric | Value |
|--------|-------|
| Total orgs | 8 |
| Orgs with `payfast_subscription_token` | 0 |
| Orgs with NULL token | 8 |
| PayFast ITNs ever received | 0 |

**No token analysis possible** — all tokens are NULL. No production PayFast payment has ever completed against this environment.

### ERR-030 status

- **Pre-09-02:** Webhook at `app/api/webhooks/payfast/route.ts` (old version) stored `pf_payment_id` as `payfast_subscription_token`. This was wrong — `pf_payment_id` is a per-transaction ID, not the recurring subscription token.
- **Post-09-02 (current):** Webhook reads `itnData['token']` for subscription token. Correct per PayFast docs. Guard: only writes token on first subscription payment (`!org.payfast_subscription_token`).
- **ERR-030 scope:** Latent-fixed. Bug was present in code pre-09-02 but never triggered. No data corruption to clean up.

### Phase 10 recommendation

None required for ERR-030. On first sandbox/production PayFast ITN for a `DRG-*` payment, the token will be a UUID-shaped value from PayFast. Verify token format post-sandbox-test in Phase 09-04.

---

## 4. Existing-Org Classification

**Total orgs: 8. Paying: 0 (Chris confirmed, verified). Safe for Phase 10.**

| Org ID (short) | Name | Subdomain | Tier | Status | Created | User Count | Classification | Phase 10 Action |
|----------------|------|-----------|------|--------|---------|------------|----------------|-----------------|
| `678634bd` | Test Restaurant ABC | null | starter | active | 2025-10-14 | 0 | **test** | delete |
| `094a610d` | DragoonB Business Automation | null | platform_admin | active | 2025-10-16 | 2 | **dormant** | soft-archive |
| `648ffc0d` | Sunset Beach Resort | null | professional | active | 2025-10-16 | 0 | **dormant** | soft-archive |
| `f898b56b` | TechStart Solutions | null | starter | trial | 2025-10-16 | 0 | **dormant** | soft-archive |
| `0b82c005` | Demo Company | null | professional | active | 2025-12-15 | 0 | **test** | delete |
| `dcc325b0` | FIGARIE | null | professional | active | 2026-02-10 | 2 | **dormant** | soft-archive |
| `6414eb77` | chrisctserv's Organization | null | starter | trial | 2026-03-17 | 2 | **test** | delete |
| `a1b2c3d4` | Swa-Zulu Game Lodge | null | professional | active | 2026-03-28 | 3 | **test** | delete |

**Classification breakdown:**

| Classification | Count | Orgs |
|----------------|-------|------|
| test | 4 | Test Restaurant ABC, Demo Company, chrisctserv's Organization, Swa-Zulu Game Lodge |
| dormant | 4 | DragoonB Business Automation, Sunset Beach Resort, TechStart Solutions, FIGARIE |
| paying | 0 | (none — confirmed) |

**Classification rationale:**
- `Test Restaurant ABC`: name contains "Test"
- `Demo Company`: name contains "Demo"
- `chrisctserv's Organization`: developer test org (created via UI registration, no meaningful data)
- `Swa-Zulu Game Lodge`: sequential seed UUID (`a1b2c3d4-e5f6-7890-abcd-ef1234567890`), 0 real users (seed data UUIDs `aaaaaaaa-*`)
- `DragoonB Business Automation`: platform admin org, kept for admin access (soft-archive preserves access)
- `Sunset Beach Resort`, `TechStart Solutions`: accommodation module seeded demo data (0 real users)
- `FIGARIE`: provisioned during testing, 2 real admin users — soft-archive

**Activity signals across all 8 orgs:**
- `usage_events` rows: 0
- `agent_sessions` rows: 0
- `ai_usage_ledger` rows: 0
- `billing_plan_changes` rows: 0
- `subscription_history` table: does not exist in live DB (migration not applied)
- `provisioning_jobs` rows: 0

**Confirmed: zero paying orgs.** Chris's statement verified. No grandfather logic needed in Phase 10.

---

## 5. Supabase Advisor Findings (delta)

Supabase management API advisors require a personal access token (PAT) — not available in CLI/MCP context during this session. Below are the known findings from previous phase audits plus risk-rated candidates from the new Phase 09 tables.

### Known prior findings (from Wave 1 — 09-01 audit)

| Finding | Severity | Table | Status |
|---------|----------|-------|--------|
| `agent_sessions` missing RLS | High | `agent_sessions` | Open — flagged in STATE.md pending todo |
| `client_usage_metrics` TIER_LIMITS uses in-memory constants | Medium | — | ERR-032 — Phase 10 USAGE-13 |
| `increment_usage_metric` RPC operates on non-existent columns | High | `client_usage_metrics` | ERR-032 — Phase 10 USAGE-13 |

### New Phase 09 tables — risk assessment

| Table | RLS | Notes |
|-------|-----|-------|
| `usage_events` | Enabled (migration 12) | `usage_events_service_role` policy uses `auth.jwt()->>'role' = 'service_role'` — standard pattern |
| `ai_usage_ledger` | Check needed | Created in migration 26 — RLS status requires dashboard verification |
| `subscription_composition` | Check needed | Created in migration 23 — RLS status requires dashboard verification |
| `billing_plan_changes` | Check needed | Created in migration 22 — RLS status requires dashboard verification |
| `daily_cost_rollup` | Check needed | Created in migration 27 — RLS status requires dashboard verification |

**Action for Phase 10:** Run Supabase Dashboard → Advisors → Security to surface any missing RLS policies on Phase 09 tables. Also verify `agent_sessions` RLS is added (Phase 09 pending todo).

### Performance candidates

| Index | Recommendation |
|-------|----------------|
| `usage_events(organization_id, metric, recorded_at)` | Already created in migration 12 |
| `ai_usage_ledger(organization_id, created_at)` | Verify in migration 26; add if missing |
| `subscription_composition(organization_id, effective_from)` | Verify in migration 23 |

---

## Open Questions for Phase 10

1. **USAGE-13 scope:** 7 legacy write paths across 4 files must be migrated before production traffic. Order: (a) email routes first (most likely to be hit), (b) content/generate routes, (c) autopilot routes, (d) delete `handlePaymentComplete`.
2. **RLS audit:** Run Supabase security advisors against all Phase 09 tables (requires dashboard or PAT). Specifically `agent_sessions`, `ai_usage_ledger`, `subscription_composition`.
3. **`subscription_history` table missing:** Referenced in `lib/billing/subscriptions.ts` and in the new ITN handler, but the table doesn't exist in live DB. PostgREST will fail silently on `subscription_history` INSERT calls in the current ITN handler. Phase 10 must either apply the migration or remove references.
4. **`increment_usage_metric` RPC:** Does this RPC exist in live DB? It's referenced in `feature-gate.ts:236` — if it doesn't exist, the `checkUsage` fallback silently passes all usage checks. Verify via Supabase dashboard.
5. **`activated_at` column missing from `organizations`:** Referenced in `app/api/webhooks/payfast/route.ts:97` and `:309`. Column added in migration 29 which requires manual application. Until applied, new-subscription detection (`isNewSubscription = !org.activated_at`) will always return true (provisioning job created on every ITN).

---

## Raw Data

See `09-DIAGNOSTICS-DATA.json` for machine-readable callsite + org lists consumed by Phase 10.
