-- Phase 14.3 — claim_approval_jobs(p_limit) plpgsql proc
-- Required by lib/approvals/jobs/worker.ts which calls supabase.rpc('claim_approval_jobs', { p_limit })
-- FOR UPDATE SKIP LOCKED prevents worker double-pickup across concurrent cron ticks
CREATE OR REPLACE FUNCTION claim_approval_jobs(p_limit integer DEFAULT 5)
RETURNS SETOF approval_jobs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_ids uuid[];
BEGIN
  -- Lock + collect ids in one CTE-style step
  SELECT array_agg(id) INTO v_job_ids
  FROM (
    SELECT id FROM approval_jobs
    WHERE status = 'queued'
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  ) sub;

  IF v_job_ids IS NULL THEN
    RETURN;
  END IF;

  -- Flip to running and return the rows
  RETURN QUERY
  UPDATE approval_jobs
  SET status = 'running', started_at = now()
  WHERE id = ANY(v_job_ids)
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_approval_jobs(integer) TO authenticated, service_role;
