-- Phase 14.3 — approval_jobs table for async handler execution (SKIP LOCKED dequeue)
CREATE TABLE IF NOT EXISTS approval_jobs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id uuid NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  run_attempt         integer NOT NULL DEFAULT 1,
  force_retry         boolean NOT NULL DEFAULT false,
  status              text NOT NULL DEFAULT 'queued',  -- queued | running | done | failed
  handler_path        text NOT NULL,                   -- action_type qualified key, e.g. 'draggonnb.damage_charge'
  payload             jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at        timestamptz NOT NULL DEFAULT now(),
  started_at          timestamptz,
  completed_at        timestamptz,
  error_text          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (approval_request_id, run_attempt)
);

CREATE INDEX IF NOT EXISTS approval_jobs_queued_idx
  ON approval_jobs (status, created_at)
  WHERE status = 'queued';

ALTER TABLE approval_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_jobs FORCE ROW LEVEL SECURITY;

-- Standard tenant isolation via approval_request join
CREATE POLICY approval_jobs_tenant_select ON approval_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM approval_requests ar
      WHERE ar.id = approval_jobs.approval_request_id
        AND ar.target_org_id = get_user_org_id()
    )
  );
