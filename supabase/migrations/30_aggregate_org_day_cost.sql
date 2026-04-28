-- Phase 09 / REQ USAGE-10
-- Aggregates ai_usage_ledger rows for one org over a [day_start, day_end) window
-- into the canonical column shape required by daily_cost_rollup (from migration 27).
-- Returns 0/0/0 for orgs with no activity in window — caller can choose to skip the upsert.

CREATE OR REPLACE FUNCTION aggregate_org_day_cost(
  p_org_id UUID,
  p_day_start TIMESTAMPTZ,
  p_day_end TIMESTAMPTZ
)
RETURNS TABLE (
  total_cost_zar_cents INTEGER,
  total_input_tokens INTEGER,
  total_output_tokens INTEGER,
  total_cache_read_tokens INTEGER,
  total_cache_write_tokens INTEGER,
  call_count INTEGER,
  failed_call_count INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT
    COALESCE(SUM(cost_zar_cents), 0)::INTEGER AS total_cost_zar_cents,
    COALESCE(SUM(input_tokens), 0)::INTEGER AS total_input_tokens,
    COALESCE(SUM(output_tokens), 0)::INTEGER AS total_output_tokens,
    COALESCE(SUM(cache_read_tokens), 0)::INTEGER AS total_cache_read_tokens,
    COALESCE(SUM(cache_write_tokens), 0)::INTEGER AS total_cache_write_tokens,
    COUNT(*)::INTEGER AS call_count,
    COUNT(*) FILTER (WHERE error IS NOT NULL)::INTEGER AS failed_call_count
  FROM ai_usage_ledger
  WHERE organization_id = p_org_id
    AND recorded_at >= p_day_start
    AND recorded_at < p_day_end;
$$;

COMMENT ON FUNCTION aggregate_org_day_cost IS
  'Phase 09: aggregates ai_usage_ledger for daily_cost_rollup cron. Returns 0s for orgs with no activity in window.';

-- RLS not applicable to functions; SECURITY DEFINER executes with table owner privileges.
-- Caller (cost-rollup cron) is service_role + CRON_SECRET-guarded.

GRANT EXECUTE ON FUNCTION aggregate_org_day_cost(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
