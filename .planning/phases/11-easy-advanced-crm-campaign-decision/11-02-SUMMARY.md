---
phase: 11
plan_id: 11-02
title: Campaign Studio schema migrations + AgentType extension
subsystem: campaign-studio
tags: [supabase, migrations, rls, pg-cron, agent-types, typescript]
wave: 1
depends_on: []
provides:
  - campaigns table (Campaign Studio)
  - campaign_drafts table
  - campaign_runs table
  - campaign_run_items table
  - campaign_status + campaign_channel ENUMs
  - run_status + run_item_status ENUMs
  - cancel_org_campaign_runs(UUID) SECURITY DEFINER RPC
  - AgentType union extensions (campaign_drafter, campaign_brand_safety)
affects:
  - 11-04 (CampaignDrafterAgent — needs campaign_drafter in AgentType)
  - 11-05 (BrandSafetyAgent — needs campaign_brand_safety in AgentType)
  - 11-10 (Campaign Studio UI — reads all 4 tables)
  - 11-11 (Kill switch admin API — calls cancel_org_campaign_runs RPC)
tech-stack:
  added: []
  patterns:
    - OPS-05 multi-step migration discipline (ENUMs in separate migrations from tables, RLS separate from DDL)
    - SECURITY DEFINER RPC with REVOKE PUBLIC + GRANT service_role
    - pg_cron unschedule wrapped in EXCEPTION block (idempotent kill switch)
key-files:
  created:
    - supabase/migrations/42_campaign_types.sql
    - supabase/migrations/43_campaigns_table.sql
    - supabase/migrations/44_campaign_drafts_table.sql
    - supabase/migrations/45_campaign_run_types.sql
    - supabase/migrations/46_campaign_runs_table.sql
    - supabase/migrations/47_campaign_run_items_table.sql
    - supabase/migrations/48_campaign_rls_policies.sql
    - supabase/migrations/49_campaign_kill_switch_function.sql
  modified:
    - lib/agents/types.ts
decisions:
  - id: D-001
    context: Old CRM-era campaigns table (different schema, 0 rows) existed from create_marketing_campaigns migration
    decision: Drop old campaigns table + old campaign_status enum in migration 42 (CASCADE), then create new schema in migration 43
    rationale: 0 rows confirmed before migration; no data loss; old schema was incompatible with Campaign Studio requirements
  - id: D-002
    context: campaign_run_items has no organization_id column
    decision: RLS policy is service_role only; users read via JOIN through campaign_runs in application layer
    rationale: Per plan spec; avoids FK cost and aligns with adapter execute path using service role
metrics:
  duration: ~25 minutes
  completed: 2026-04-27
  migrations_applied: 8 (42-49)
  loc_added: ~420
---

# Phase 11 Plan 02: Campaign Studio Schema Migrations + AgentType Extension Summary

Eight migrations (42-49) applied to Supabase project `psqfgzbjbgqrmjskdavs` creating the full Campaign Studio data layer, plus the `AgentType` union extended with two new campaign agent types.

## What Was Built

**ENUMs (migrations 42, 45):**
- `campaign_status`: draft | pending_review | scheduled | running | completed | failed | killed
- `campaign_channel`: email | sms | facebook | instagram | linkedin
- `run_status`: pending | executing | completed | failed | killed
- `run_item_status`: pending | sent | failed | skipped | verified

**Tables (migrations 43, 44, 46, 47):**
- `campaigns`: intent, channels[], force_review override flag, audit cols nullable per OPS-05, FORCE RLS
- `campaign_drafts`: brand_safe BOOLEAN NULLABLE (null = not yet checked), safety_flags[], UNIQUE(campaign_id, channel), FORCE RLS
- `campaign_runs`: cron_job_name TEXT UNIQUE (for kill-switch lookup), item counters, FORCE RLS
- `campaign_run_items`: published_url nullable (set by verify step), no cascade on draft FK (audit trail), FORCE RLS

**RLS (migration 48):** Org-scoped read/write + service_role on campaigns + campaign_drafts; org-read + service_role on campaign_runs; service_role only on campaign_run_items.

**Kill switch RPC (migration 49):** `cancel_org_campaign_runs(p_org_id UUID) RETURNS INTEGER` — iterates pending/executing runs, wraps `cron.unschedule()` in EXCEPTION block, marks runs `killed`. REVOKE PUBLIC; GRANT service_role only.

**AgentType extension:** `lib/agents/types.ts` union extended with `'campaign_drafter'` and `'campaign_brand_safety'` after accommodation agents block. `tsc --noEmit` passes (3 pre-existing errors in elijah/social test files unrelated to this change).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing campaigns table and campaign_status enum conflict**

- **Found during:** Task 1, pre-execution DB inspection
- **Issue:** Old CRM-era `campaigns` table (from `create_marketing_campaigns` migration, ~Oct 2025) existed in live DB with incompatible schema: missing `intent`, `channels`, `force_review`, `scheduled_at`, `approved_by`. Old `campaign_status` enum had values `draft,scheduled,active,paused,completed` — missing `pending_review`, `running`, `failed`, `killed`. Both had 0 rows.
- **Fix:** Migration 42 drops old `campaigns` table (CASCADE) and old `campaign_status` enum before creating new Campaign Studio ENUMs. Migration 43 creates fresh `campaigns` with correct schema. No data loss (0 rows confirmed).
- **Files modified:** `supabase/migrations/42_campaign_types.sql` (DROP TABLE + DROP TYPE added before CREATE TYPE)
- **Commits:** 0a80d8a6

## Verification Results

- All 8 migrations applied cleanly in order (42 → 49) on live Supabase project
- `campaign_status` 7 values, `campaign_channel` 5 values, `run_status` 5 values, `run_item_status` 5 values — all correct
- `campaigns` table: 14 columns including intent, channels[], force_review, audit cols nullable
- `campaign_drafts` table: 16 columns including brand_safe BOOLEAN nullable, UNIQUE(campaign_id, channel)
- `campaign_runs` table: cron_job_name UNIQUE present
- `cancel_org_campaign_runs` RPC: proname exists, prosecdef=true, service_role grant confirmed
- RLS policies: 3 on campaigns, 3 on campaign_drafts, 2 on campaign_runs, 1 on campaign_run_items
- Kill switch smoke test: RPC called with pending run + fake cron_job_name, exception block caught cron.unschedule failure, run flipped to 'killed'
- `tenant_modules.config` untouched (65 rows with config — no kill_switch_active written)
- `AgentType` union: `grep` returns 2 lines for campaign_drafter + campaign_brand_safety
- `tsc --noEmit` exit 0

## Next Phase Readiness

Plans 11-04 and 11-05 (CampaignDrafterAgent + BrandSafetyAgent) are now unblocked — AgentType union accepts both new types and the campaign_drafts table exists for writes. Plan 11-11 (kill switch admin API) can call `cancel_org_campaign_runs(org_id)` via service role.
