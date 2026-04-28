-- scripts/diagnostics/phase-09/audit-client-usage-metrics.sql
-- Phase 09-05 Diagnostic 1: client_usage_metrics column-mismatch state
-- Read-only. Run via Supabase SQL editor or psql.
--
-- FINDINGS (confirmed 2026-04-26 via PostgREST column probe against live DB):
--   Actual columns that EXIST:
--     id, organization_id, posts_created, posts_published,
--     ai_generations_count, api_calls_count, storage_used_mb, metric_date,
--     created_at, updated_at
--   Columns that DO NOT EXIST (but are referenced in legacy code):
--     posts_monthly, ai_generations_monthly, api_calls_monthly, reset_date
--     posts_limit, ai_generations_limit, api_calls_limit, storage_limit_mb
--     emails_sent_monthly, emails_limit, agent_invocations_monthly,
--     autopilot_runs_monthly, monthly_posts_used, monthly_ai_generations_used
--
-- CONCLUSION: ERR-032 is Case A (only actual columns exist; all legacy-assumed
-- column names are absent). Every write to these missing columns is a silent
-- no-op because Supabase/PostgREST returns a 42703 column-not-found error that
-- each caller ignores (non-fatal error handling).

-- === 1. Confirm actual table schema ===
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'client_usage_metrics'
ORDER BY ordinal_position;

-- Expected columns (actual): id, organization_id, posts_created, posts_published,
-- ai_generations_count, api_calls_count, storage_used_mb, metric_date, created_at, updated_at

-- === 2. Row counts ===
SELECT
  COUNT(*) AS total_rows,
  COUNT(DISTINCT organization_id) AS distinct_orgs
FROM client_usage_metrics;

-- Expected: 0 rows (confirmed in Wave 1 audit 2026-04-25)

-- === 3. Cross-check: which column names do NOT exist that legacy code assumes? ===
SELECT
  col_check.assumed_col,
  col_check.referenced_in,
  EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'client_usage_metrics'
       AND column_name = col_check.assumed_col
  ) AS col_exists
FROM (
  VALUES
    ('monthly_posts_used',           'lib/billing/subscriptions.ts:310'),
    ('monthly_ai_generations_used',  'lib/billing/subscriptions.ts:311'),
    ('reset_date',                   'lib/billing/subscriptions.ts:312'),
    ('posts_monthly',                'lib/tier/feature-gate.ts:191,226'),
    ('ai_generations_monthly',       'lib/tier/feature-gate.ts:192,227'),
    ('emails_sent_monthly',          'app/api/email/send/route.ts:85,282; app/api/email/campaigns/.../route.ts:72,286'),
    ('emails_limit',                 'app/api/email/send/route.ts:85'),
    ('agent_invocations_monthly',    'lib/tier/feature-gate.ts:193,228 (via increment_usage_metric RPC)'),
    ('autopilot_runs_monthly',       'lib/tier/feature-gate.ts:194,229 (via increment_usage_metric RPC)')
) AS col_check(assumed_col, referenced_in);

-- === 4. Cross-check with usage_events (new system) ===
SELECT
  COUNT(*) AS total_usage_events,
  COUNT(DISTINCT organization_id) AS orgs_in_usage_events
FROM usage_events;

-- Expected: 0 rows (no production traffic yet; new orgs will populate via record_usage_event)

-- === 5. Per-org dual-state view ===
SELECT
  o.id,
  o.name,
  o.subscription_tier,
  COUNT(c.id)                         AS legacy_rows,
  MAX(c.metric_date)                  AS legacy_last_metric_date,
  COUNT(ue.id)                        AS new_event_count
FROM organizations o
LEFT JOIN client_usage_metrics c  ON c.organization_id = o.id
LEFT JOIN usage_events ue         ON ue.organization_id = o.id
GROUP BY o.id, o.name, o.subscription_tier
ORDER BY o.created_at;

-- Expected: all 8 orgs, 0 legacy rows each, 0 new events each

-- === End of diagnostic ===
