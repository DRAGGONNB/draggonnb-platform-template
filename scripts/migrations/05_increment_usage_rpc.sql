-- ============================================================================
-- Migration: Atomic Usage Increment RPC Function
-- Prevents race conditions when multiple requests increment usage concurrently
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_usage_metric(
  p_organization_id UUID,
  p_column_name TEXT,
  p_amount INTEGER DEFAULT 1
) RETURNS VOID AS $$
BEGIN
  -- Validate column name to prevent SQL injection
  IF p_column_name NOT IN (
    'posts_monthly',
    'ai_generations_monthly',
    'emails_sent_monthly',
    'agent_invocations_monthly'
  ) THEN
    RAISE EXCEPTION 'Invalid column name: %', p_column_name;
  END IF;

  -- Upsert with atomic increment
  EXECUTE format(
    'INSERT INTO client_usage_metrics (organization_id, %I, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (organization_id)
     DO UPDATE SET %I = COALESCE(client_usage_metrics.%I, 0) + $2, updated_at = now()',
    p_column_name, p_column_name, p_column_name
  ) USING p_organization_id, p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
