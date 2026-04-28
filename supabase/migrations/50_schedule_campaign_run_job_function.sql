-- Phase 11. Single-purpose migration per OPS-05. Wraps pg_cron + pg_net into one RPC call from app code.
-- Called by scheduleCampaignRun() / scheduleVerifyJob() in lib/campaigns/scheduler.ts (Plan 11-11).
-- SECURITY DEFINER so service_role app code can schedule cron jobs without direct pg_cron access.

CREATE OR REPLACE FUNCTION schedule_campaign_run_job(
  p_job_name TEXT,
  p_cron_expr TEXT,
  p_url TEXT,
  p_hmac TEXT,
  p_run_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM cron.schedule(
    p_job_name,
    p_cron_expr,
    format(
      $sql$ SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-hmac', %L),
        body := jsonb_build_object('run_id', %L)::text
      ) $sql$,
      p_url, p_hmac, p_run_id
    )
  );
END;
$$;

-- Revoke public access; only service_role (used by scheduleCampaignRun() via admin client) may call this.
REVOKE ALL ON FUNCTION schedule_campaign_run_job(TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION schedule_campaign_run_job(TEXT, TEXT, TEXT, TEXT, UUID) TO service_role;
