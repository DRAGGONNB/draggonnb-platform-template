-- scripts/migrations/phase-09/audit-client-usage-metrics.sql
-- Phase 09 diagnostic — Task 09-01-07
-- Read-only. Run via Supabase SQL editor or psql.
--
-- BACKGROUND (ERR-029 from STATE.md):
--   Webhook code may reference column names that differ from the actual table schema.
--   This script confirms the actual schema and surfaces any mismatch with webhook assumptions.
--
-- FINDINGS (2026-04-25, live DB audit):
--   Actual columns: id, organization_id, metric_date, posts_created, posts_published,
--                   ai_generations_count, api_calls_count, storage_used_mb,
--                   created_at, updated_at
--   (NO: posts_monthly, ai_generations_monthly, reset_date)
--
-- OUTPUT: Pipe to a file and reference in Plan 09-05 diagnostics report.
--   psql "$DATABASE_URL" -f scripts/migrations/phase-09/audit-client-usage-metrics.sql

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

-- === 2. Row counts ===
SELECT COUNT(*) AS total_rows FROM client_usage_metrics;

-- === 3. Activity summary using actual column names ===
SELECT
  COUNT(*) AS total_rows,
  SUM(posts_created) AS total_posts_created,
  SUM(posts_published) AS total_posts_published,
  COUNT(*) FILTER (WHERE posts_created > 0) AS rows_posts_nonzero,
  COUNT(*) FILTER (WHERE ai_generations_count > 0) AS rows_ai_nonzero,
  MAX(metric_date) AS most_recent_metric_date,
  MIN(metric_date) AS earliest_metric_date
FROM client_usage_metrics;

-- === 4. Recent activity check (last 7 days by metric_date) ===
SELECT COUNT(*) AS rows_last_7d
FROM client_usage_metrics
WHERE metric_date > CURRENT_DATE - interval '7 days';

-- === 5. Cross-check: which column names do NOT exist that webhook code assumes? ===
-- This query surfaces the mismatch: columns referenced in webhook reset logic
-- vs actual table schema.
SELECT
  col_check.assumed_col,
  EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'client_usage_metrics'
       AND column_name = col_check.assumed_col
  ) AS col_exists
FROM (
  VALUES
    ('monthly_posts_used'),
    ('monthly_ai_generations_used'),
    ('posts_monthly'),
    ('ai_generations_monthly'),
    ('reset_date')
) AS col_check(assumed_col);

-- === 6. Cross-check with usage_events — dual-state confirmation ===
-- NOTE: usage_events uses recorded_at (not created_at)
SELECT
  COUNT(DISTINCT organization_id) AS orgs_in_usage_events,
  (SELECT COUNT(DISTINCT organization_id) FROM client_usage_metrics) AS orgs_in_legacy_metrics
FROM usage_events
WHERE recorded_at > now() - interval '30 days';

-- === 7. Per-org dual-state view ===
-- NOTE: usage_events uses recorded_at (not created_at)
SELECT
  o.id,
  o.name,
  o.subscription_tier,
  SUM(c.posts_created) AS legacy_posts_created,
  SUM(c.ai_generations_count) AS legacy_ai_count,
  MAX(c.metric_date) AS legacy_last_metric_date,
  (SELECT COUNT(*) FROM usage_events ue WHERE ue.organization_id = o.id) AS new_events_count
FROM organizations o
LEFT JOIN client_usage_metrics c ON c.organization_id = o.id
GROUP BY o.id, o.name, o.subscription_tier
ORDER BY o.created_at DESC
LIMIT 20;

-- === End of audit ===
-- Capture output for 09-DIAGNOSTICS.md in Plan 09-05
-- Key finding: client_usage_metrics uses metric_date (not reset_date) and
-- posts_created/posts_published/ai_generations_count (not posts_monthly/ai_generations_monthly).
-- Any webhook code using the old column names is silently broken.
