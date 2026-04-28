---
phase: 11
plan_id: 11-01
title: CRM schema migrations (crm_activities, suggestions, dismissals, drafts, ui_mode)
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/36_crm_activities_table.sql
  - supabase/migrations/37_crm_action_suggestions_table.sql
  - supabase/migrations/38_crm_action_dismissals_table.sql
  - supabase/migrations/39_entity_drafts_table.sql
  - supabase/migrations/40_user_profiles_ui_mode.sql
  - supabase/migrations/41_seed_crm_stale_thresholds.sql
autonomous: true
estimated_loc: 320
estimated_dev_minutes: 90
---

## Objective

Ship the foundational CRM schema needed for Phase 11 Easy view. Creates `crm_activities` (NEW — does NOT currently exist in any migration despite CONTEXT.md assumption), `crm_action_suggestions` (nightly N8N cache), `crm_action_dismissals` (per-user 7d hide), `entity_drafts` (1s-debounced autosave with 7d TTL), `user_profiles.ui_mode` column, and seeds `tenant_modules.config.crm.stale_thresholds_days` defaults onto existing crm-module rows. All migrations follow OPS-05 multi-step discipline (one change per file; new tables created with all columns NULLABLE-or-defaulted; no NOT NULL added to populated tables).

## must_haves

- `crm_activities` table exists with `source` (default `'advanced'`, enum includes `'easy_view'`), `action_type`, `entity_type/id`, `metadata` JSONB, RLS on/forced, org-read policy via `get_user_org_id()` (closes UX-05 audit-trail prerequisite).
- `crm_action_suggestions` table exists with `card_type` CHECK (`followup`, `hot_lead`), `score` INTEGER, `score_breakdown` JSONB, `refreshed_at`, UNIQUE(org, card_type, entity_id), RLS forced, service_role write policy.
- `crm_action_dismissals` table exists keyed by `(user_id, suggestion_card_type, entity_id)` with `expires_at` (7 days), RLS forced, owner-only read/write.
- `entity_drafts` table exists keyed by `(user_id, entity_type, entity_id NULLABLE)` with `draft_data` JSONB, `last_modified_at`, `expires_at` default `NOW() + INTERVAL '7 days'`, RLS forced, owner-only access (UX-07).
- `user_profiles` table exists (CREATE TABLE IF NOT EXISTS guard — Risk #3 in RESEARCH) with `ui_mode TEXT NULLABLE` column added; index on `(id, ui_mode)`.
- All existing `tenant_modules` rows where `module_id='crm'` have `config.crm.stale_thresholds_days = {"lead":7,"qualified":14,"proposal":10,"negotiation":21}` after the seed migration. (Real DB enum — diverges from CONTEXT.md `discovery/qualification/closing`; trusts RESEARCH per planner instruction.)
- `npm run typecheck` and `supabase db push` against a Supabase branch succeed without errors.

## Tasks

<task id="1">
  <title>Migration 36: create crm_activities table (NEW table — does not exist yet)</title>
  <files>supabase/migrations/36_crm_activities_table.sql</files>
  <actions>
    Create the `crm_activities` table from scratch (Risk #1 in RESEARCH — researcher confirmed no existing migration creates it). Include:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`
    - `user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL` (nullable — automation-sourced rows have no user)
    - `entity_type TEXT NOT NULL CHECK (entity_type IN ('contact','deal','company'))`
    - `entity_id UUID NOT NULL`
    - `action_type TEXT NOT NULL CHECK (action_type IN ('email_sent','stage_moved','task_created','note_added','deal_archived','snoozed','dismissed'))`
    - `source TEXT NOT NULL DEFAULT 'advanced' CHECK (source IN ('easy_view','advanced','automation','api'))`
    - `metadata JSONB NOT NULL DEFAULT '{}'`
    - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
    Indexes: `(organization_id, entity_type, entity_id, created_at DESC)` and partial `(organization_id, source) WHERE source='easy_view'`.
    Enable + force RLS. Policies: org-read via `get_user_org_id()`; org-write same; service_role full access.
    Top-of-file comment: "Phase 11. NEW table — CONTEXT.md assumed it existed; researcher A confirmed it did not. Single-purpose migration per OPS-05."
  </actions>
  <verification>
    `supabase db diff --linked` shows clean DDL.
    `psql -c "\d crm_activities"` shows all columns + constraints.
    `psql -c "SELECT polname FROM pg_policy WHERE polrelid='crm_activities'::regclass;"` returns 3 policies.
  </verification>
</task>

<task id="2">
  <title>Migrations 37 + 38: crm_action_suggestions + crm_action_dismissals</title>
  <files>supabase/migrations/37_crm_action_suggestions_table.sql, supabase/migrations/38_crm_action_dismissals_table.sql</files>
  <actions>
    **Migration 37** — `crm_action_suggestions` per RESEARCH section 2:
    - columns: id, organization_id (FK orgs ON DELETE CASCADE), card_type TEXT CHECK IN ('followup','hot_lead') (stale_deals NOT cached — pure SQL), entity_type CHECK IN ('contact','deal'), entity_id UUID, score INTEGER DEFAULT 0, score_breakdown JSONB DEFAULT '{}', refreshed_at TIMESTAMPTZ DEFAULT NOW(), n8n_run_id TEXT, created_at, updated_at, UNIQUE(organization_id, card_type, entity_id).
    - Indexes: partial on `(organization_id, card_type) WHERE refreshed_at > NOW() - INTERVAL '25 hours'`; full on `(organization_id, card_type, score DESC)`.
    - `update_updated_at_column()` trigger.
    - RLS forced; org-read policy; service_role full-access policy (N8N writes via service role).

    **Migration 38** — `crm_action_dismissals` (referenced in CONTEXT.md but not researched in detail; matches owner-scoped pattern):
    - columns: id, organization_id FK, user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, suggestion_card_type TEXT (matches `crm_action_suggestions.card_type` values), entity_type TEXT, entity_id UUID NOT NULL, dismissed_at TIMESTAMPTZ DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'), UNIQUE(user_id, suggestion_card_type, entity_id).
    - Index `(user_id, expires_at)` for cleanup query.
    - RLS forced; owner-only SELECT/INSERT/DELETE via `user_id = auth.uid()`; service_role full access.

    Both files start with `-- Phase 11. Single-purpose migration per OPS-05.` header comment.
  </actions>
  <verification>
    `supabase db push` against branch succeeds.
    `psql -c "INSERT INTO crm_action_suggestions (...) VALUES (...) ON CONFLICT (organization_id, card_type, entity_id) DO UPDATE..."` succeeds (UPSERT pattern N8N will use).
    `psql -c "SELECT count(*) FROM crm_action_dismissals WHERE expires_at < NOW();"` runs without error.
  </verification>
</task>

<task id="3">
  <title>Migrations 39 + 40 + 41: entity_drafts, user_profiles.ui_mode, stale-threshold seed</title>
  <files>supabase/migrations/39_entity_drafts_table.sql, supabase/migrations/40_user_profiles_ui_mode.sql, supabase/migrations/41_seed_crm_stale_thresholds.sql</files>
  <actions>
    **Migration 39 — `entity_drafts`** per RESEARCH section 3:
    - columns: id, organization_id FK CASCADE, user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, entity_type TEXT NOT NULL, entity_id UUID NULLABLE (NULL = new-entity draft), draft_data JSONB DEFAULT '{}', last_modified_at TIMESTAMPTZ DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'), created_at, updated_at, UNIQUE(user_id, entity_type, entity_id).
    - Indexes: `(organization_id, user_id)`; partial `(entity_type, entity_id) WHERE entity_id IS NOT NULL`; partial `(expires_at) WHERE expires_at < NOW() + INTERVAL '8 days'` for cleanup.
    - update_updated_at_column trigger.
    - RLS forced; owner-only read/write via `user_id = auth.uid()`; service_role full access.

    **Migration 40 — `user_profiles.ui_mode`** per RESEARCH section 4 (Risk #3 guard):
    - `CREATE TABLE IF NOT EXISTS user_profiles (id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, full_name TEXT, updated_at TIMESTAMPTZ DEFAULT NOW());` (defensive — schema not in any prior migration but referenced by `lib/auth/get-user-org.ts`).
    - `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ui_mode TEXT;` (NULLABLE by design — NULL = use role default; this is permanent semantic, not a backfill gap; OPS-05 step-4 NOT NULL is intentionally skipped — document this in the file header comment).
    - `COMMENT ON COLUMN user_profiles.ui_mode IS 'easy | advanced | NULL (NULL = role default applies). Set by toggle.';`
    - `CREATE INDEX IF NOT EXISTS user_profiles_ui_mode_idx ON user_profiles (id, ui_mode);`

    **Migration 41 — seed stale_thresholds** per RESEARCH section 6 (uses REAL DB enum `lead/qualified/proposal/negotiation`, NOT CONTEXT.md `discovery/qualification/closing`):
    ```sql
    UPDATE tenant_modules
    SET config = jsonb_set(
      COALESCE(config, '{}'),
      '{crm,stale_thresholds_days}',
      '{"lead": 7, "qualified": 14, "proposal": 10, "negotiation": 21}'::jsonb
    )
    WHERE module_id = 'crm'
      AND (config->'crm'->'stale_thresholds_days') IS NULL;
    ```
    Header comment: "Phase 11. Seeds default stale thresholds onto existing CRM tenants. New provisioning step inserts these by default — see Plan 11-08."
  </actions>
  <verification>
    `supabase db push` succeeds in order 39 → 40 → 41.
    `psql -c "SELECT config->'crm'->'stale_thresholds_days' FROM tenant_modules WHERE module_id='crm';"` returns the seeded JSONB on every CRM tenant.
    `psql -c "INSERT INTO entity_drafts (organization_id, user_id, entity_type, draft_data) VALUES (...);"` succeeds; `expires_at` auto-set to ~7d future.
    `psql -c "\d user_profiles"` shows `ui_mode` column nullable.
  </verification>
</task>

## Verification

- All 6 migrations apply cleanly to a Supabase branch (`supabase db push`).
- `npm run typecheck` passes (no Supabase types regenerated yet — types regen happens in 11-03).
- Seed migration is idempotent — running twice does not double-write or error.
- RLS verified by `SELECT polname, polcmd FROM pg_policy WHERE polrelid::regclass::text IN ('crm_activities','crm_action_suggestions','crm_action_dismissals','entity_drafts');` showing org-scoped or owner-scoped access only.
- No existing migration is edited (append-only per CLAUDE.md OPS-05).

## Out of scope

- Do NOT add NOT NULL to `user_profiles.ui_mode` — NULL is load-bearing semantic for "use role default" (RESEARCH section 4 escape hatch from OPS-05 step 4; document in migration 40 header).
- Do NOT create a `crm_tasks` table (Risk #6) — hot-lead task creation writes a `crm_activities` row with `action_type='task_created'` and metadata `{ due_at, assignee_id }` instead. Full task management deferred to v3.1.
- Do NOT create an `email_tracking_events` table (Risk #2) — engagement scoring v3.0 uses `contacts.last_contacted_at` + manual flag only. JSONB `score_breakdown` schema is forward-compatible.
- Do NOT add Campaign Studio tables here — those are in Plan 11-02.
- Do NOT touch CRM API routes or pages — schema only.

## REQ-IDs closed

- (Foundational for) UX-04, UX-05, UX-07. Full closure happens in Plans 11-07/08/09 once code reads/writes these tables.
