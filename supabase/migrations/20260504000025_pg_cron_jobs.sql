-- Phase 14.3 — pg-cron schedules for approval spine
-- Pre-flight confirmed: pg_net IS available (Job 2 active); vercel.json cron is defense-in-depth only
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function: sweep_expired_approvals — invoked by Vercel cron fallback path (lib/approvals/expiry-sweep.ts).
-- pg-cron Job 1 below does the same work inline; this function exists for the non-pg_net fallback path.
CREATE OR REPLACE FUNCTION sweep_expired_approvals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $FN$
DECLARE
  v_expired_count integer;
BEGIN
  UPDATE approval_requests
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now();
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  -- W2: same idempotency pattern as Job 1 — NOT EXISTS check, no time window
  INSERT INTO approval_jobs (approval_request_id, run_attempt, handler_path, payload, status)
  SELECT ar.id, 1, '__expiry_notify__', jsonb_build_object('reason', 'expired'), 'queued'
  FROM approval_requests ar
  WHERE ar.status = 'expired'
    AND NOT EXISTS (
      SELECT 1 FROM approval_jobs aj
      WHERE aj.approval_request_id = ar.id
        AND aj.handler_path = '__expiry_notify__'
    )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('expired', v_expired_count);
END;
$FN$;

GRANT EXECUTE ON FUNCTION sweep_expired_approvals() TO authenticated, service_role;

-- Job 1: Expiry sweep every 5 minutes (always — no pg_net needed; calls plpgsql directly)
SELECT cron.schedule(
  'approval-expiry-sweep',
  '*/5 * * * *',
  $$
    UPDATE approval_requests
    SET status = 'expired', updated_at = now()
    WHERE status = 'pending'
      AND expires_at < now();

    -- Notify worker pickup via approval_jobs to fire notify_on_complete + Telegram 'Expired' edit
    -- W2: idempotency via NOT EXISTS check (no time-window filter — race-window-free)
    INSERT INTO approval_jobs (approval_request_id, run_attempt, handler_path, payload, status)
    SELECT ar.id, 1, '__expiry_notify__', jsonb_build_object('reason', 'expired'), 'queued'
    FROM approval_requests ar
    WHERE ar.status = 'expired'
      AND NOT EXISTS (
        SELECT 1 FROM approval_jobs aj
        WHERE aj.approval_request_id = ar.id
          AND aj.handler_path = '__expiry_notify__'
      )
    ON CONFLICT DO NOTHING;
  $$
);

-- Job 2: Worker dequeue every 30 seconds — pg_net IS available (confirmed in pre-flight)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    PERFORM cron.schedule(
      'approval-jobs-worker',
      '30 seconds',
      $JOB$
        SELECT net.http_post(
          url := current_setting('app.internal_api_url') || '/api/cron/approval-worker',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-internal-cron-secret', current_setting('app.internal_cron_secret')
          ),
          body := '{}'::jsonb
        )
        FROM (SELECT 1 FROM approval_jobs WHERE status = 'queued' LIMIT 1) any_queued;
      $JOB$
    );
  END IF;
END $$;

-- Job 3: telegram_update_log retention cleanup (daily, 03:00 UTC)
SELECT cron.schedule(
  'cleanup-telegram-update-log',
  '0 3 * * *',
  $$DELETE FROM telegram_update_log WHERE processed_at < now() - INTERVAL '30 days'$$
);
