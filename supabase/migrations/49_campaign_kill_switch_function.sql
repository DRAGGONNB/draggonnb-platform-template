-- Phase 11. Per-tenant kill switch RPC.
-- Wrap pg_cron unschedule in EXCEPTION block — Risk: idempotent re-call in v3.1+
-- when 100+ jobs/tenant.
-- Kill switch storage lives in tenant_modules.config.campaigns.kill_switch_active JSONB --
-- NOT a new column/table. This RPC handles the run cancellation side only.

CREATE OR REPLACE FUNCTION cancel_org_campaign_runs(p_org_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job_name  TEXT;
  cancelled INTEGER := 0;
BEGIN
  -- Unschedule any pending/executing pg_cron jobs for this org
  FOR job_name IN
    SELECT cron_job_name
      FROM campaign_runs
     WHERE organization_id = p_org_id
       AND status IN ('pending', 'executing')
       AND cron_job_name IS NOT NULL
  LOOP
    BEGIN
      PERFORM cron.unschedule(job_name);
    EXCEPTION WHEN OTHERS THEN
      -- Job may already be gone (completed between query and unschedule); safe to ignore
      NULL;
    END;
    cancelled := cancelled + 1;
  END LOOP;

  -- Mark all pending/executing runs as killed
  UPDATE campaign_runs
     SET status = 'killed',
         completed_at = now()
   WHERE organization_id = p_org_id
     AND status IN ('pending', 'executing');

  RETURN cancelled;
END;
$$;

-- Revoke public access; grant only to service_role (called by admin kill-switch API in Plan 11-11)
REVOKE ALL ON FUNCTION cancel_org_campaign_runs(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cancel_org_campaign_runs(UUID) TO service_role;
