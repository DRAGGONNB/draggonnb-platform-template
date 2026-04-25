---
phase: 09-foundations-guard-rails
plan: 01
subsystem: database
tags: [postgres, supabase, rls, billing, ai-cost, jsonb, rpc, migrations]

requires:
  - phase: 11-billing-plans
    provides: billing_plans table (base_plan_id FK target) + update_updated_at_column() function
  - phase: 00-initial-schema
    provides: organizations table, get_user_org_id() function

provides:
  - organizations.billing_plan_snapshot JSONB (nullable snapshot at subscribe-time)
  - pricing_changelog table (immutable audit trail for price changes)
  - subscription_composition table (current + historical composition per org, partial unique index)
  - billing_addons_catalog table + 7 seed rows (modules, setup_fee, overage_packs)
  - agent_sessions table (created fresh) + 6 nullable cost/token columns
  - ai_usage_ledger table (one row per Anthropic call, 14 cols, 4 indexes)
  - daily_cost_rollup table (pre-aggregated per-org daily cost)
  - get_month_to_date_ai_cost(UUID) RPC (STABLE SECURITY DEFINER, returns ZAR cents)
  - audit-client-usage-metrics.sql diagnostic script (surfaced full column-mismatch map)

affects:
  - 09-02 (billing composition logic — needs subscription_composition + billing_addons_catalog)
  - 09-03 (usage enforcement + BaseAgent cost ledger — needs ai_usage_ledger + agent_sessions columns)
  - 09-04 (cost rollup cron — needs daily_cost_rollup + get_month_to_date_ai_cost)
  - 09-05 (diagnostics — needs audit script output for client_usage_metrics mismatch report)

tech-stack:
  added: []
  patterns:
    - "SECURITY DEFINER + STABLE + SET search_path = public for RPCs that bypass caller RLS"
    - "Partial unique index WHERE effective_to IS NULL for one-current-row-per-org invariant"
    - "ON CONFLICT (id) DO NOTHING for idempotent seed inserts"
    - "CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS for cross-environment idempotency"
    - "DO $$ verification blocks with RAISE EXCEPTION on missing artifacts"

key-files:
  created:
    - supabase/migrations/22_billing_composition.sql
    - supabase/migrations/23_subscription_composition.sql
    - supabase/migrations/24_billing_addons_catalog.sql
    - supabase/migrations/25_agent_sessions_cost.sql
    - supabase/migrations/26_ai_usage_ledger.sql
    - supabase/migrations/27_daily_cost_rollup.sql
    - scripts/migrations/phase-09/audit-client-usage-metrics.sql
    - scripts/migrations/phase-09/README.md
  modified:
    - organizations (billing_plan_snapshot column added)
    - agent_sessions (6 new cost/token columns added)

key-decisions:
  - "user_role enum has no platform_admin value — pricing_changelog admin policy uses role='admin' (highest available tier)"
  - "agent_sessions not in live DB (migration 05 not applied remotely) — migration 25 includes CREATE TABLE IF NOT EXISTS for idempotency"
  - "client_usage_metrics actual schema differs from plan assumptions: uses posts_created/posts_published/ai_generations_count/metric_date (not posts_monthly/ai_generations_monthly/reset_date) — audit script corrected to use actual column names"
  - "COMMENT ON COLUMN organizations.payfast_subscription_token removed from migration 22 — column does not exist yet on the live DB"

patterns-established:
  - "OPS-05 discipline: all new columns on existing tables NULLABLE; NOT NULL in Phase 10 after backfill"
  - "billing_addons_catalog.id = TEXT PK (e.g., finance_ai, topup_posts_100) for readable FK references"
  - "get_month_to_date_ai_cost queries ai_usage_ledger directly (not rollup table) for real-time circuit-breaker accuracy"

duration: 20min
completed: 2026-04-25
---

# Phase 09 Plan 01: Database Foundations Summary

**6 schema migrations (22-27) applied to live Supabase: billing composition, AI cost ledger, RPC helper, + full column-mismatch audit confirming all 5 webhook-assumed column names are absent from client_usage_metrics**

## Performance

- **Duration:** 20 min
- **Started:** 2026-04-25T06:54:38Z
- **Completed:** 2026-04-25T07:15:05Z
- **Tasks:** 7
- **Files created:** 8

## Accomplishments

- Applied all 6 migrations (22-27) against the live shared Supabase project — zero data loss, 8 orgs row count unchanged
- `billing_addons_catalog` seeded with exactly 7 locked rows (finance_ai R399, events R299, white_label R499, setup_fee R1499, 3 top-up packs)
- `get_month_to_date_ai_cost(UUID)` RPC deployed — callable by authenticated + service_role, returns 0 for empty ledger (circuit-breaker ready)
- Audit confirmed: all 5 column names assumed by legacy webhook code (`posts_monthly`, `ai_generations_monthly`, `reset_date`, `monthly_posts_used`, `monthly_ai_generations_used`) do NOT exist in `client_usage_metrics` — full mismatch scope now documented for Plan 09-05

## Task Commits

1. **Task 1: Migration 22 — billing_plan_snapshot + pricing_changelog** - `130d95e3` (feat)
2. **Task 2: Migration 23 — subscription_composition** - `babc3be5` (feat)
3. **Task 3: Migration 24 — billing_addons_catalog + seed** - `ffcf8b5e` (feat)
4. **Task 4: Migration 25 — agent_sessions cost columns** - `e129382b` (feat)
5. **Task 5: Migration 26 — ai_usage_ledger** - `832ca096` (feat)
6. **Task 6: Migration 27 — daily_cost_rollup + RPC** - `9b5e7a48` (feat)
7. **Task 7: Audit script + README** - `cb07cc56` (feat)

## Files Created

- `supabase/migrations/22_billing_composition.sql` — billing_plan_snapshot NULLABLE + pricing_changelog table + RLS
- `supabase/migrations/23_subscription_composition.sql` — composition history table + partial unique index
- `supabase/migrations/24_billing_addons_catalog.sql` — addon catalog table + 7 seeded rows
- `supabase/migrations/25_agent_sessions_cost.sql` — agent_sessions (created + 6 nullable cost/token columns)
- `supabase/migrations/26_ai_usage_ledger.sql` — one-row-per-Anthropic-call ledger + 4 indexes
- `supabase/migrations/27_daily_cost_rollup.sql` — daily rollup table + get_month_to_date_ai_cost RPC
- `scripts/migrations/phase-09/audit-client-usage-metrics.sql` — read-only diagnostic (corrected to actual schema)
- `scripts/migrations/phase-09/README.md` — usage instructions + column mismatch context

## Audit Script Output (live DB, 2026-04-25)

| Check | Result |
|-------|--------|
| client_usage_metrics total_rows | 0 |
| rows with posts_created > 0 | 0 |
| rows with ai_generations_count > 0 | 0 |
| rows_last_7d (by metric_date) | 0 |
| orgs_in_usage_events (last 30d) | 0 |
| orgs_in_legacy_metrics | 0 |

Column mismatch confirmed: `monthly_posts_used`, `monthly_ai_generations_used`, `posts_monthly`, `ai_generations_monthly`, `reset_date` — all `col_exists = false`.

## Decisions Made

- **user_role enum**: No `platform_admin` value in `{admin,manager,user,client}`. Policy uses `role = 'admin'` for pricing_changelog read access.
- **agent_sessions not in live DB**: Migration 25 includes `CREATE TABLE IF NOT EXISTS` with the original 05_leads_and_agents.sql schema + the 6 new columns, ensuring idempotency across environments.
- **payfast_subscription_token comment removed**: Column doesn't exist yet on organizations — plan assumed it did. Replaced with inline comment in migration file for future reference.
- **audit script column corrections**: Plan's SQL used `posts_monthly`, `ai_generations_monthly`, `reset_date` — none exist. Script corrected to actual column names. Also corrected `usage_events.created_at` to `recorded_at` (actual column name).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] pricing_changelog RLS policy used non-existent role value 'platform_admin'**
- **Found during:** Task 1 (Migration 22 application)
- **Issue:** `CHECK (role = 'platform_admin')` in RLS policy fails at apply time — `user_role` enum is `{admin,manager,user,client}`, no `platform_admin`
- **Fix:** Changed to `role = 'admin'` (highest available role)
- **Files modified:** supabase/migrations/22_billing_composition.sql
- **Verification:** Migration applied successfully; 2 policies confirmed
- **Committed in:** 130d95e3

**2. [Rule 1 - Bug] COMMENT ON COLUMN organizations.payfast_subscription_token fails — column absent**
- **Found during:** Task 1 (Migration 22 first apply attempt)
- **Issue:** `payfast_subscription_token` does not exist on organizations in the live DB
- **Fix:** Removed the COMMENT ON COLUMN statement; replaced with inline SQL comment
- **Files modified:** supabase/migrations/22_billing_composition.sql
- **Verification:** Migration applied without error
- **Committed in:** 130d95e3

**3. [Rule 3 - Blocking] agent_sessions table not present in live Supabase**
- **Found during:** Task 4 (Migration 25 preparation)
- **Issue:** Migration 05_leads_and_agents.sql defines agent_sessions but was never applied to the live DB; ALTER TABLE would fail
- **Fix:** Migration 25 includes `CREATE TABLE IF NOT EXISTS agent_sessions` with the original schema, then `ADD COLUMN IF NOT EXISTS` for the 6 new columns
- **Files modified:** supabase/migrations/25_agent_sessions_cost.sql
- **Verification:** All 6 columns confirmed nullable; tokens_used preserved
- **Committed in:** e129382b

**4. [Rule 1 - Bug] audit script SQL used non-existent column names for client_usage_metrics**
- **Found during:** Task 7 (audit script verification)
- **Issue:** Plan's SQL assumed `posts_monthly`, `ai_generations_monthly`, `reset_date` — actual columns are `posts_created`, `posts_published`, `ai_generations_count`, `metric_date`. Also `usage_events.created_at` → actual is `recorded_at`
- **Fix:** Updated all queries in audit script to use actual column names. Added mismatch-confirmation query (query 5) that explicitly checks all 5 assumed names — all confirmed absent
- **Files modified:** scripts/migrations/phase-09/audit-client-usage-metrics.sql
- **Verification:** All 5 audit queries execute without errors; mismatch confirmed
- **Committed in:** cb07cc56

---

**Total deviations:** 4 auto-fixed (2 bug, 2 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep. Mismatch bug surface is larger than the plan assumed — column names in both the webhook code AND the plan's own SQL were incorrect.

## Issues Encountered

- Supabase MCP tool (`mcp__plugin_supabase_supabase__apply_migration`) was unavailable in this session. All migrations applied via Supabase Management REST API (`POST /v1/projects/{id}/database/query`) — same result, same verification.

## Open Questions for Next Plans

- **subscription_composition backfill** (8 existing orgs): Deferred to Plan 09-02 after `compose()` logic lands in `lib/billing/composition.ts`
- **billing_plan_snapshot backfill** (8 existing orgs): Same — deferred to 09-02
- **client_usage_metrics resolution**: 3 options for Plan 09-05 — (a) fix webhook col refs, (b) add alias columns, (c) migrate to usage_events and deprecate legacy table. Table currently has 0 rows (no active usage tracking anywhere)
- **agent_sessions RLS**: Table created without RLS policies in migration 25 (original schema had none). RLS should be added as part of Plan 09-03 when BaseAgent inserts begin

## Next Phase Readiness

Ready for Plan 09-02 (billing composition logic):
- `subscription_composition` + `billing_addons_catalog` + `billing_plan_snapshot` all in place
- `get_month_to_date_ai_cost()` callable for cost ceiling checks
- Schema dependencies for 09-03, 09-04, 09-05 all satisfied

---
*Phase: 09-foundations-guard-rails*
*Completed: 2026-04-25*
