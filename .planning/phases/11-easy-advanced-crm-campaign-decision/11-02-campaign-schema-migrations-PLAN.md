---
phase: 11
plan_id: 11-02
title: Campaign Studio schema migrations + AgentType extension
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/42_campaign_types.sql
  - supabase/migrations/43_campaigns_table.sql
  - supabase/migrations/44_campaign_drafts_table.sql
  - supabase/migrations/45_campaign_run_types.sql
  - supabase/migrations/46_campaign_runs_table.sql
  - supabase/migrations/47_campaign_run_items_table.sql
  - supabase/migrations/48_campaign_rls_policies.sql
  - supabase/migrations/49_campaign_kill_switch_function.sql
  - lib/agents/types.ts
autonomous: true
estimated_loc: 420
estimated_dev_minutes: 120
---

## Objective

Ship Campaign Studio schema and the new agent type registrations. Creates `campaigns`, `campaign_drafts`, `campaign_runs`, `campaign_run_items` tables, the `cancel_org_campaign_runs(p_org_id)` SECURITY DEFINER RPC for the kill switch, and extends the `AgentType` union with `'campaign_drafter'` and `'campaign_brand_safety'`. Per-tenant kill switch state lives in `tenant_modules.config.campaigns.kill_switch_active` (no new column/table — JSONB key, per CONTEXT.md Claude's-discretion + RESEARCH section 7).

Per OPS-05 multi-step discipline, ENUM types are extracted into their own migrations (42 for campaign-level types, 45 for run-level types) so the table migrations (43, 44, 46, 47) each contain a single CREATE TABLE statement. Migration sequence: 42 (campaign ENUMs) → 43 (campaigns) → 44 (campaign_drafts) → 45 (run ENUMs) → 46 (campaign_runs) → 47 (campaign_run_items) → 48 (RLS policies) → 49 (kill switch RPC).

## must_haves

- `campaigns` table exists with `intent`, `status` (enum `draft|pending_review|scheduled|running|completed|failed|killed`), `channels campaign_channel[]`, `force_review` (override flag for 30-day gate), audit columns nullable per OPS-05 step 1, RLS forced.
- `campaign_drafts` table exists with `channel`, `subject`, `body_html`, `body_text`, `media_urls`, `brand_safe BOOLEAN NULLABLE` (null = not yet checked), `safety_flags TEXT[]`, `agent_session_id`, UNIQUE(campaign_id, channel).
- `campaign_runs` table exists with `cron_job_name TEXT UNIQUE` (for `cron.unschedule()` lookup), `status run_status`, item counters.
- `campaign_run_items` table exists with `provider_message_id`, `published_url` (nullable, set by verify), `status run_item_status`.
- All 4 campaign tables have RLS enabled and forced; org-scoped read/write policies + service_role full access (in separate migration 48 per OPS-05).
- `cancel_org_campaign_runs(p_org_id UUID) RETURNS INTEGER` SECURITY DEFINER function exists and unschedules pg_cron jobs whose `cron_job_name` matches and marks runs `killed`.
- `lib/agents/types.ts` `AgentType` union includes `'campaign_drafter'` and `'campaign_brand_safety'` (RESEARCH B section 13 — TS build fails without these before plans 11-04/05).

## Tasks

<task id="1">
  <title>Migrations 42 + 43 + 44: campaign ENUMs + campaigns table + campaign_drafts table</title>
  <files>supabase/migrations/42_campaign_types.sql, supabase/migrations/43_campaigns_table.sql, supabase/migrations/44_campaign_drafts_table.sql</files>
  <actions>
    **Migration 42 — `campaign_types`** (ENUM types only, OPS-05 single-purpose):
    ```sql
    -- Phase 11. Single-purpose migration per OPS-05. Campaign-level ENUM types only.
    CREATE TYPE campaign_status AS ENUM ('draft','pending_review','scheduled','running','completed','failed','killed');
    CREATE TYPE campaign_channel AS ENUM ('email','sms','facebook','instagram','linkedin');
    ```

    **Migration 43 — `campaigns` table** per RESEARCH B section 2:
    - Table columns: id, organization_id (FK orgs CASCADE), name TEXT NOT NULL, intent TEXT NOT NULL, status campaign_status DEFAULT 'draft' NOT NULL, scheduled_at TIMESTAMPTZ NULLABLE, channels campaign_channel[] DEFAULT '{}' NOT NULL, force_review BOOLEAN DEFAULT false NOT NULL (admin override flag for 30-day gate; column name kept per RESEARCH despite counter-intuitive read — comment in file explains semantic), created_by UUID NULLABLE (OPS-05 step 1; backfill not required since new table), approved_by UUID NULLABLE, approved_at TIMESTAMPTZ, published_at TIMESTAMPTZ, created_at, updated_at.
    - Indexes: `(organization_id)`, `(organization_id, status)`, partial `(scheduled_at) WHERE scheduled_at IS NOT NULL`.
    - RLS enabled + forced (policies in migration 48).
    - update_updated_at_column trigger.

    **Migration 44 — `campaign_drafts`** per RESEARCH B section 2:
    - Columns: id, campaign_id FK CASCADE, organization_id FK CASCADE, channel campaign_channel NOT NULL, subject TEXT NULLABLE, body_html TEXT NULLABLE, body_text TEXT NULLABLE, media_urls TEXT[] DEFAULT '{}', brand_safe BOOLEAN NULLABLE (null = not yet checked, per RESEARCH B section 8), safety_flags TEXT[] DEFAULT '{}', is_approved BOOLEAN DEFAULT false NOT NULL, approved_at TIMESTAMPTZ, regeneration_count INTEGER DEFAULT 0 NOT NULL, agent_session_id UUID (no FK — agent_sessions has no PK we can rely on cross-RLS), created_at, updated_at.
    - Indexes: `(campaign_id)`, `(organization_id)`, UNIQUE `(campaign_id, channel)`.
    - update_updated_at_column trigger.

    Each file starts with `-- Phase 11. Single-purpose migration per OPS-05.` header.
  </actions>
  <verification>
    `supabase db push` applies 42, 43, 44 in order without error.
    `psql -c "SELECT typname FROM pg_type WHERE typname IN ('campaign_status','campaign_channel');"` returns 2 rows (after 42).
    `psql -c "\d campaigns"`, `\d campaign_drafts` show expected columns.
  </verification>
</task>

<task id="2">
  <title>Migrations 45 + 46 + 47: run ENUMs + campaign_runs table + campaign_run_items table</title>
  <files>supabase/migrations/45_campaign_run_types.sql, supabase/migrations/46_campaign_runs_table.sql, supabase/migrations/47_campaign_run_items_table.sql</files>
  <actions>
    **Migration 45 — `campaign_run_types`** (ENUM types only):
    ```sql
    -- Phase 11. Single-purpose migration per OPS-05. Run-level ENUM types only.
    CREATE TYPE run_status AS ENUM ('pending','executing','completed','failed','killed');
    CREATE TYPE run_item_status AS ENUM ('pending','sent','failed','skipped','verified');
    ```

    **Migration 46 — `campaign_runs`** per RESEARCH B section 2:
    - Columns: id, campaign_id FK CASCADE, organization_id FK CASCADE, status run_status DEFAULT 'pending' NOT NULL, cron_job_name TEXT UNIQUE NULLABLE (set at schedule time as `'campaign_run_'||id::text`), scheduled_at, started_at, completed_at, items_total INTEGER DEFAULT 0, items_sent INTEGER DEFAULT 0, items_failed INTEGER DEFAULT 0, error_message TEXT, created_at.
    - Indexes: `(organization_id)`, `(campaign_id)`.
    - RLS enabled + forced (policies in migration 48).

    **Migration 47 — `campaign_run_items`** per RESEARCH B section 2:
    - Columns: id, run_id FK CASCADE, campaign_draft_id FK (no cascade — keep audit), channel campaign_channel, status run_item_status DEFAULT 'pending', recipient_ref TEXT, provider_message_id TEXT, published_url TEXT NULLABLE (set after verify), sent_at, verified_at, error_code TEXT, error_message TEXT, created_at.
    - Indexes: `(run_id)`.
    - RLS enabled + forced (policies in migration 48).

    Each file starts with `-- Phase 11. Single-purpose migration per OPS-05.` header.
  </actions>
  <verification>
    `supabase db push` applies 45, 46, 47 in order.
    `psql -c "SELECT typname FROM pg_type WHERE typname IN ('run_status','run_item_status');"` returns 2 rows (after 45).
    `psql -c "\d campaign_runs"`, `\d campaign_run_items` show expected columns.
  </verification>
</task>

<task id="3">
  <title>Migration 48: RLS policies (separate from DDL per OPS-05) + Migration 49: kill-switch RPC</title>
  <files>supabase/migrations/48_campaign_rls_policies.sql, supabase/migrations/49_campaign_kill_switch_function.sql</files>
  <actions>
    **Migration 48 — RLS policies** for all 4 campaign tables, per RESEARCH B section 2:
    ```sql
    -- campaigns
    CREATE POLICY campaigns_org_read ON campaigns FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
    CREATE POLICY campaigns_org_write ON campaigns FOR ALL USING (organization_id = (SELECT public.get_user_org_id()));
    CREATE POLICY campaigns_service_role ON campaigns FOR ALL USING (auth.jwt()->>'role' = 'service_role');
    -- campaign_drafts (same pattern)
    -- campaign_runs (org-read + service_role; user-write goes through API which uses service role)
    -- campaign_run_items (service_role only — users read via JOIN through campaign_runs in application layer)
    ```
    Cover all four tables. Service-role policy is required for pg_net + scheduling RPC + adapter execute paths.

    **Migration 49 — `cancel_org_campaign_runs` RPC** per RESEARCH B section 5:
    ```sql
    CREATE OR REPLACE FUNCTION cancel_org_campaign_runs(p_org_id UUID)
    RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
    DECLARE job_name TEXT; cancelled INTEGER := 0;
    BEGIN
      FOR job_name IN
        SELECT cron_job_name FROM campaign_runs
         WHERE organization_id = p_org_id
           AND status IN ('pending','executing')
           AND cron_job_name IS NOT NULL
      LOOP
        BEGIN
          PERFORM cron.unschedule(job_name);
        EXCEPTION WHEN OTHERS THEN NULL; -- job may already be gone
        END;
        cancelled := cancelled + 1;
      END LOOP;
      UPDATE campaign_runs
        SET status = 'killed', completed_at = now()
       WHERE organization_id = p_org_id
         AND status IN ('pending','executing');
      RETURN cancelled;
    END;
    $$;
    REVOKE ALL ON FUNCTION cancel_org_campaign_runs(UUID) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION cancel_org_campaign_runs(UUID) TO service_role;
    ```
    File header comment: "Phase 11. Per-tenant kill switch RPC. Wrap pg_cron unschedule in EXCEPTION block — Risk: idempotent re-call in v3.1+ when 100+ jobs/tenant."
  </actions>
  <verification>
    `supabase db push` applies both migrations.
    `psql -c "SELECT proname FROM pg_proc WHERE proname='cancel_org_campaign_runs';"` returns 1 row.
    `psql -c "SELECT polname FROM pg_policy WHERE polrelid='campaigns'::regclass;"` returns 3 policies; same for `campaign_drafts`; service-role-only for `campaign_run_items`.
  </verification>
</task>

<task id="4">
  <title>Extend AgentType union for campaign agents</title>
  <files>lib/agents/types.ts</files>
  <actions>
    Edit `lib/agents/types.ts` `AgentType` union (currently lines 10-23). Add two new union members at the end of the existing list:
    ```typescript
    | 'campaign_drafter'
    | 'campaign_brand_safety'
    ```
    Place them after the accommodation agents block. Do NOT touch any other type/interface in this file. This unblocks Plans 11-04/05 (CampaignDrafterAgent + BrandSafetyAgent both need their `agentType` to be valid in the union).
  </actions>
  <verification>
    `npm run typecheck` passes.
    `grep -E "campaign_drafter|campaign_brand_safety" lib/agents/types.ts` returns 2 lines.
  </verification>
</task>

## Verification

- All 8 campaign migrations apply cleanly in order (42 → 49) on a Supabase branch.
- `npm run typecheck` passes after AgentType extension (no callers reference the new types yet — that comes in 11-04/05).
- Kill switch RPC verified by manually inserting a `campaign_runs` row with status `pending` + cron_job_name `'campaign_run_test'`, calling `SELECT cancel_org_campaign_runs(...)`, asserting status flips to `killed`.
- No data loss on existing `tenant_modules` rows — kill switch JSONB key is read-on-demand; no migration writes it (default-absent = `kill_switch_active = false`).

## Out of scope

- Do NOT write the `tenant_modules.config.campaigns.kill_switch_active = true` JSONB value here — that is set by the admin kill-switch API in Plan 11-11.
- Do NOT touch `social_accounts` (Risk: that table references legacy `users` FK; adapters in Plan 11-04 read by `organization_id` only).
- Do NOT add `campaign_kill_switch` audit table — kill events are logged via Telegram alert + the `campaign_runs.status='killed'` rows themselves (Plan 11-11).
- Do NOT register any new agents in `agent_sessions` — that table already supports the new types via TEXT column; no migration needed.
- Do NOT touch CRM tables — those are in Plan 11-01.

## REQ-IDs closed

- (Foundational for) CAMP-01..08. Full closure happens in Plans 11-04/05/10/11.
