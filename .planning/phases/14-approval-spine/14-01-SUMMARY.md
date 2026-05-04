---
phase: 14-approval-spine
plan: 01
subsystem: database
tags: [supabase, postgresql, approval-requests, telegram, migrations, ops-05]

# Dependency graph
requires: []
provides:
  - "approval_requests has 14 new product-scoped nullable columns (13 product cols + notify_on_complete jsonb)"
  - "handler_run_count NOT NULL DEFAULT 0 ships safely (OPS-05 exception — default backfills existing rows)"
  - "post_id NOT NULL dropped (retained for Phase 17 cleanup)"
  - "telegram_update_log table for APPROVAL-09 replay protection (service_role only, RLS enabled)"
  - "user_profiles.telegram_user_id BIGINT NULL with partial UNIQUE index"
  - "database.types.ts regenerated reflecting all new columns/tables"
affects:
  - "14-02-PLAN.md"
  - "14-03-PLAN.md"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OPS-05 split: additive nullable DDL in deploy 1 (this), backfill in deploy 2 (14-02), NOT NULL + spine in deploy 3 (14-03)"
    - "notify_on_complete jsonb as dedicated column NOT nested in action_payload (CONTEXT C3 — prevents silent skip when action_payload is null)"
    - "telegram_update_log service_role-only access via FORCE ROW LEVEL SECURITY + zero RLS policies (W7 trade-off)"
    - "Partial UNIQUE index on nullable column (WHERE telegram_user_id IS NOT NULL) allows multiple NULLs during rollout"

key-files:
  created:
    - supabase/migrations/20260504000001_approval_spine_14_1_columns.sql
    - supabase/migrations/20260504000002_telegram_update_log_table.sql
    - supabase/migrations/20260504000003_user_profiles_telegram_user_id.sql
  modified:
    - lib/supabase/database.types.ts

key-decisions:
  - "handler_run_count NOT NULL DEFAULT 0 ships in 14-01 (OPS-05 safe exception — DEFAULT fills all existing rows during ADD COLUMN)"
  - "legacy assigned_to uuid[] retained for v3.0 backwards-compat (DROP in Phase 17)"
  - "notify_on_complete jsonb is a DEDICATED column NOT nested in action_payload (W1/CONTEXT C3 — dispatchNotifyOnComplete reads ar.notify_on_complete directly)"
  - "telegram_update_log has NO RLS SELECT policy in v3.1 (W7 trade-off — bot_org_id mapping non-trivial under D9 single-bot-per-org; admin audit via direct DB query; defer to v3.2)"

patterns-established:
  - "Additive nullable migration pattern: IF NOT EXISTS on every ADD COLUMN for idempotency"
  - "OPS-05 safe NOT NULL: only use when DEFAULT covers all existing rows (no data scan needed)"
  - "Partial unique index: CREATE UNIQUE INDEX WHERE col IS NOT NULL — allows NULLs during staged rollout"

# Metrics
duration: 15min
completed: 2026-05-04
---

# Phase 14 Plan 01: Approval Spine Schema Summary

**Three additive migrations deployed to live Supabase adding 14 product-scoped columns to approval_requests, telegram_update_log replay-protection table, and user_profiles.telegram_user_id for verifyApprover() — schema substrate for grammY bot and /approvals UI landing in 14-03**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-04T06:53:02Z
- **Completed:** 2026-05-04T07:08:00Z
- **Tasks:** 3
- **Files modified:** 4 (3 migrations + database.types.ts)

## Accomplishments

- Applied 3 OPS-05-compliant migrations to live Supabase `psqfgzbjbgqrmjskdavs` — all additive, no data modifications
- `approval_requests` gains 14 product-scoped columns (13 nullable + `handler_run_count` NOT NULL DEFAULT 0) + 3 performance indexes + `post_id` NOT NULL dropped
- `telegram_update_log` table created for APPROVAL-09 replay protection with service_role-only access (RLS enabled, FORCE RLS, zero policies in v3.1)
- `user_profiles.telegram_user_id` BIGINT NULL with partial UNIQUE index for APPROVAL-11 `verifyApprover()` lookup
- `database.types.ts` regenerated — all 14 new columns typed correctly; `handler_run_count: number` (no null union); `post_id: string | null`; `tsc --noEmit` clean (3 pre-existing errors only)

## Verification SQL Output

```
new_cols=14, post_id_nullable=YES, update_log=1, update_log_policies=0, tg_user_id=1
```

All 5 acceptance checks passed against live DB.

## Columns Added to approval_requests

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| product | text | YES | Product scope (e.g. 'accommodation', 'crm') |
| target_resource_type | text | YES | e.g. 'booking', 'damage' |
| target_resource_id | text | YES | UUID or string ID of target record |
| target_org_id | uuid | YES | Target org when cross-org |
| action_type | text | YES | e.g. 'damage_charge', 'rate_change' |
| action_payload | jsonb | YES | Action-specific data blob |
| notify_on_complete | jsonb | YES | Dedicated proposer-feedback config (CONTEXT C3) |
| proposed_to | text | YES | 'all_admins' or 'specific_user' |
| assigned_approvers | uuid[] | YES | GIN indexed for My Queue lookups |
| telegram_message_id | bigint | YES | Two-pass message edit ID |
| telegram_chat_id | bigint | YES | Two-pass message edit chat |
| rejection_reason | text | YES | Free text for 'other' rejection |
| rejection_reason_code | text | YES | Enum: wrong_amount / not_chargeable / need_more_info / other |
| handler_run_count | integer | NO (DEFAULT 0) | OPS-05 safe exception |

**Also:** `post_id` NOT NULL dropped (column retained, FK kept, NOT NULL removed for generalization).

## Indexes Created

| Index | Type | Column | Where clause |
|-------|------|--------|--------------|
| approval_requests_expires_pending_idx | BTREE | expires_at | status = 'pending' |
| approval_requests_assigned_approvers_gin | GIN | assigned_approvers | — |
| approval_requests_product_status_idx | BTREE | (product, status) | — |

## Task Commits

Each task committed atomically:

1. **Task 1: Apply 3 approval spine migrations to live Supabase** - `72208cf6` (feat)
2. **Task 2: Regenerate database.types.ts + verify tsc clean** - `5d5a7b6a` (chore)
3. **Task 3: STATE.md + SUMMARY.md** - (docs — this commit)

## Files Created/Modified

- `supabase/migrations/20260504000001_approval_spine_14_1_columns.sql` — approval_requests: 14 new cols + 3 indexes + post_id NOT NULL dropped
- `supabase/migrations/20260504000002_telegram_update_log_table.sql` — telegram_update_log: BIGINT PK + processed_at + bot_org_id FK nullable + RLS
- `supabase/migrations/20260504000003_user_profiles_telegram_user_id.sql` — user_profiles: telegram_user_id BIGINT NULL + partial UNIQUE index
- `lib/supabase/database.types.ts` — regenerated, 175 net insertions reflecting all schema changes

## Decisions Made

1. **handler_run_count NOT NULL DEFAULT 0 in 14-01** — OPS-05 allows NOT NULL when DEFAULT covers all existing rows. No separate backfill step needed. This is the only NOT NULL column added in this plan.

2. **notify_on_complete as dedicated jsonb column** — Per CONTEXT C3 (W1): `dispatchNotifyOnComplete` reads `ar.notify_on_complete` directly, NOT `ar.action_payload.notify_on_complete`. This prevents silent skip when `action_payload` is null. Column added at table level, not nested.

3. **legacy assigned_to uuid[] retained** — Existing v3.0 social-post approval code was written against `assigned_to`. New product-scoped approvals use `assigned_approvers`. Both coexist until Phase 17 cleanup.

4. **telegram_update_log NO RLS SELECT policy in v3.1** — W7 trade-off: in the D9 single-bot-per-org architecture, the webhook receives all updates and routes by org. Mapping `bot_org_id` at webhook time is non-trivial. In v3.1, the bot service accesses this table via `service_role` only (bypasses RLS). Admin audit happens via direct DB query. RLS SELECT policy deferred to v3.2 when `bot_org_id` mapping is wired.

5. **Partial UNIQUE index on telegram_user_id** — `CREATE UNIQUE INDEX WHERE telegram_user_id IS NOT NULL` allows multiple NULL values during rollout (users not yet linked to Telegram). Once a user links, uniqueness is enforced.

## Deviations from Plan

None — plan executed exactly as written. Schema inspection before apply confirmed no pre-existing columns (clean slate for all 14 new cols and both new tables). `expires_at` was already present on `approval_requests` as confirmed in schema check; the index `IF NOT EXISTS` handled this safely.

## Issues Encountered

- `/tmp/` in bash resolves to `/tmp/` (Linux-style) but Node.js resolves to `C:\tmp\` on Windows. Used `--input-type=commonjs` with project-relative path instead of temp file for type generation.

## W7 Trade-off: telegram_update_log Service-Role Only

In v3.1, `telegram_update_log` has RLS enabled and FORCE ROW LEVEL SECURITY, but zero policies. This means:
- `service_role` (bot webhook handler) bypasses RLS and can INSERT/SELECT freely
- No app-level user can SELECT rows (no anon or authenticated policy)
- Admin audit requires direct DB query (Supabase Studio or psql)
- `bot_org_id` column is reserved (nullable) for v3.2 when routing per-org is implemented

A `COMMENT ON TABLE` documents this decision for ops awareness.

## Carry-forward to 14-02

- Backfill UPDATE must guard with `WHERE product IS NULL` for idempotency (re-running 14-02 must be safe)
- 14-02 must cover all existing `approval_requests` rows (currently 0 rows in live DB, but guard still required per OPS-05 discipline)
- Verify zero NULLs on backfill columns before 14-03 runs NOT NULL constraints

## Next Phase Readiness

- Schema substrate complete for 14-03 grammY bot + `/approvals` UI
- 14-02 (backfill) can execute immediately — no blockers
- Existing v3.0 social-post approval flow unaffected (additive only, no code changes)

---
*Phase: 14-approval-spine*
*Completed: 2026-05-04*
