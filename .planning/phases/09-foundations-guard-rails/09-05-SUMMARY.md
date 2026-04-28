---
phase: 09-foundations-guard-rails
plan: 05
subsystem: diagnostics
tags: [diagnostics, audit, client-usage-metrics, payfast-token, org-classification]

# Dependency graph
requires:
  - phase: 09-01
    provides: ai_usage_ledger, agent_sessions cost cols, billing_plan_snapshot — empty-table assertion baseline
  - phase: 09-02
    provides: ITN webhook fix sets the post-09-02 token-write contract this plan verifies
  - phase: 09-03
    provides: guardUsage() / record_usage_event hardening — the new code path the legacy callsite inventory feeds into

provides:
  - .planning/phases/09-foundations-guard-rails/09-DIAGNOSTICS.md — 3-issue diagnostic report (column-mismatch, token-overwrite, org classification)
  - .planning/phases/09-foundations-guard-rails/09-DIAGNOSTICS-DATA.json — machine-readable callsite + org list
  - scripts/diagnostics/phase-09/find-client-usage-metrics-callsites.sh — ripgrep callsite finder, reusable in Phase 10 USAGE-13
  - scripts/diagnostics/phase-09/check-payfast-token-state.sql — token state check across all orgs
  - scripts/diagnostics/phase-09/list-existing-orgs.sql — org classification SQL

affects:
  - phase-10 USAGE-13 (legacy cleanup uses the callsite migration map produced here)
  - phase-10 site redesign (org classification confirms safe-to-delete-test-orgs list)
  - phase-11 (existing-org cleanup before billing composition backfill)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Read-only diagnostic plan pattern (zero code changes; markdown report consumed by downstream phases)

key-files:
  created:
    - .planning/phases/09-foundations-guard-rails/09-DIAGNOSTICS.md
    - .planning/phases/09-foundations-guard-rails/09-DIAGNOSTICS-DATA.json
    - scripts/diagnostics/phase-09/find-client-usage-metrics-callsites.sh
    - scripts/diagnostics/phase-09/check-payfast-token-state.sql
    - scripts/diagnostics/phase-09/list-existing-orgs.sql

key-decisions:
  - "ERR-032 is Case A (worst-case): client_usage_metrics was renamed in a live migration; every legacy column the codebase assumes (posts_monthly, ai_generations_monthly, monthly_posts_used, reset_date, emails_sent_monthly, emails_limit, agent_invocations_monthly, autopilot_runs_monthly) is absent. All writes have been silent no-ops since the rename. Table has 0 rows."
  - "ERR-030 is latent-fixed, never triggered: 0 of 8 orgs have payfast_subscription_token set. No PayFast ITN has ever completed in production. Pre-09-02 bug never manifested in data."
  - "0 paying orgs confirmed (Chris's claim verified): 4 test, 4 dormant, 0 paying. Safe for Phase 10 with no grandfather logic. 4 test orgs flagged for delete; 4 dormant for soft-archive (1 is the platform_admin org — keep for admin access)."

patterns-established:
  - "Diagnostic-only plan output schema: markdown executive summary + per-issue section + machine-readable JSON twin for automation"

# Metrics
duration: ~30min (single commit + uncommitted output files)
completed: 2026-04-26
---

# Phase 09 Plan 05: client_usage_metrics Diagnostics Summary

**Three diagnostics: ERR-032 column-mismatch (Case A confirmed — silent no-ops everywhere), ERR-030 token-overwrite (latent-fixed, never triggered), org classification (0 paying, all 8 are test/dormant). Phase 10 USAGE-13 has its full migration map.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-04-26 (per commit 0d34c0ef)
- **Completed:** 2026-04-26
- **Tasks:** 4 diagnostic investigations consolidated into one report
- **Files created:** 5 (3 scripts + 1 markdown + 1 JSON)
- **Code changes:** 0 (read-only plan)

## Accomplishments

- ERR-032 root cause identified: `client_usage_metrics` renamed in a live migration. Actual columns: `posts_created`, `posts_published`, `ai_generations_count`, `api_calls_count`, `storage_used_mb`, `metric_date`. All 8 legacy column names referenced by code are missing.
- 7 legacy write paths across 4 files mapped for Phase 10 USAGE-13 cleanup
- ERR-030 verified inert: 0 PayFast ITNs ever received. Pre-09-02 bug never had a chance to corrupt data. Post-09-02 ITN handler reads `itnData.token` correctly.
- All 8 organizations classified: 4 test (delete), 4 dormant (soft-archive — 1 is platform_admin org for Chris admin access), 0 paying.
- Reusable diagnostic scripts left in `scripts/diagnostics/phase-09/` for Phase 10/11 to re-run during cleanup

## Task Commits

1. **Diagnostic scripts** — `0d34c0ef` chore(diagnostics): add Phase 09 SQL + shell diagnostics scripts
2. **Diagnostic outputs (markdown + JSON)** — `<commit-tbd>` docs(09-05): commit diagnostics report + machine-readable data
3. **Plan metadata** — `<commit-tbd>` docs(09-05): complete client_usage_metrics diagnostics plan

## Findings Summary

### 1. ERR-032 — Column Mismatch (Case A confirmed, worst case)

`client_usage_metrics` table was renamed in a live migration. All 8 legacy column names the codebase assumes are absent:

| Assumed column | Actual column | Code references |
|----------------|---------------|-----------------|
| `monthly_posts_used` | (gone) | `lib/billing/subscriptions.ts:310` |
| `monthly_ai_generations_used` | (gone) | `lib/billing/subscriptions.ts:311` |
| `reset_date` | `metric_date` | `lib/billing/subscriptions.ts:312` |
| `posts_monthly` | `posts_created` | `lib/tier/feature-gate.ts:191,226` |
| `ai_generations_monthly` | `ai_generations_count` | `lib/tier/feature-gate.ts:192,227` |
| `emails_sent_monthly` | (gone) | `app/api/email/send/route.ts:85,282`; `app/api/email/campaigns/[id]/send/route.ts:72,286` |
| `agent_invocations_monthly` | (gone) | `lib/tier/feature-gate.ts:193,228` (via `increment_usage_metric` RPC) |
| `autopilot_runs_monthly` | (gone) | `lib/tier/feature-gate.ts:194,229` |

**Impact:** Every cap check in the legacy path returns "allowed: true" silently because the column read returns NULL → 0 → under any limit. Every increment is a 0-row UPDATE with no error. Production has been running with effectively zero usage enforcement on legacy paths since the rename.

**Mitigating factor:** 0 paying orgs, 0 usage events. No bills were under-charged or over-charged. No customer impact.

**Phase 10 USAGE-13 migration map:** 7 write paths + 6 read paths across 4 files; 5 new API routes still on the legacy path (autopilot/chat, autopilot/generate, content/generate, content/generate/social, content/generate/email) need migration to `guardUsage()` from 09-03. `handlePaymentComplete` in `lib/billing/subscriptions.ts` is dead code (0 callers) — delete in Phase 10.

### 2. ERR-030 — PayFast Token Overwrite (latent-fixed, never triggered)

| Metric | Value |
|--------|-------|
| Total orgs | 8 |
| Orgs with `payfast_subscription_token` set | 0 |
| PayFast ITNs ever received | 0 |

**Verdict:** Pre-09-02 webhook stored `pf_payment_id` (per-transaction ID) as `payfast_subscription_token`. Post-09-02 webhook (commit `178b6491`) reads `itnData.token`. Bug existed but never triggered — no data to clean up.

**Phase 09-04 follow-on:** First sandbox/production PayFast ITN for a `DRG-*` payment will be the live verification. Sandbox runtime test deferred.

### 3. Existing-Org Classification

| Classification | Count | Orgs | Phase 10 Action |
|----------------|-------|------|-----------------|
| paying | 0 | (none) | n/a |
| dormant | 4 | DragoonB Business Automation, Sunset Beach Resort, TechStart Solutions, FIGARIE | soft-archive |
| test | 4 | Test Restaurant ABC, Demo Company, chrisctserv's Organization, Swa-Zulu Game Lodge | delete |

**Activity across all 8:** 0 usage_events, 0 agent_sessions, 0 ai_usage_ledger, 0 billing_plan_changes.

**Verified Chris's claim:** No paying orgs. Safe to proceed with Phase 10 with no billing-grandfather logic.

**Note:** `DragoonB Business Automation` is the platform_admin org and must NOT be deleted — soft-archive only (preserves Chris's admin access).

## Decisions Made

- **Case A vs Case B determination:** Confirmed Case A (only renamed columns exist) by querying `information_schema.columns` for both old and new column names. Old names returned 0 results; new names returned the actual schema.
- **Org classification heuristics:** Test orgs identified by name pattern (contains "Test" / "Demo" / dev account) or sequential seed UUIDs. Dormant orgs are non-test orgs with 0 activity signals. No org has `is_test_org` or `is_dormant` columns set on the DB — classification is heuristic, codified here for Phase 10 to act on.
- **Soft-archive vs delete:** Dormant orgs that Chris/team have admin access to or that have real users (FIGARIE has 2 admin users) get soft-archived rather than deleted, preserving auth + audit trail.

## Deviations from Plan

None. Plan was a read-only diagnostic and the executing session completed all 4 investigations as specified.

## Issues Encountered

None. All 5 deliverable files exist as specified.

## DB State

- **`client_usage_metrics` rows:** 0 (confirmed empty)
- **Orgs total:** 8
- **Orgs with `payfast_subscription_token`:** 0
- **`usage_events` rows across all orgs:** 0
- **`agent_sessions` rows across all orgs:** 0
- **`ai_usage_ledger` rows:** 0

## Open Questions

1. **Soft-archive mechanism:** Phase 10 needs to define what "soft-archive" means at the DB level. Suggested: add `archived_at TIMESTAMPTZ` to `organizations` and exclude archived orgs from listings + middleware tenant resolution.
2. **DragoonB Business Automation org:** Confirm this is the right org for Chris's platform_admin role before any archive operation. Subdomain is null on this org — verify via `organization_users` join before action.

## Next Phase Readiness

- **Phase 10 USAGE-13:** Has its full migration map. 4 files to modify, 5 API routes to migrate, 1 dead function to delete, 1 RPC to drop after migration completes.
- **Phase 10 site redesign:** Has the safe-delete list (4 test orgs) and soft-archive list (4 dormant orgs).
- **Phase 11:** Org cleanup can run before billing composition backfill — composition backfill from 09-02 already populated all 8 orgs (8 composition_rows live), so backfill is complete; archive operation just needs to set `effective_to` on the composition rows for archived orgs.

---
*Phase: 09-foundations-guard-rails*
*Completed: 2026-04-26*
