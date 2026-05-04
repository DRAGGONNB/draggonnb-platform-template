-- Phase 14.3 — audit_log table + approval_requests status-change trigger
-- Pre-flight: audit_log table was ABSENT from live DB (confirmed via information_schema query).
-- Migration creates it here with FULL schema (before_state/after_state/actor_id all present).
-- Trigger uses FULL variant matching the schema created below.

-- Create audit_log if it does not exist
CREATE TABLE IF NOT EXISTS audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL,
  resource_id   text NOT NULL,
  action        text NOT NULL,
  actor_id      uuid REFERENCES auth.users(id),
  before_state  jsonb,
  after_state   jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_resource_idx ON audit_log (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

-- Admin read policy: service_role bypasses RLS; anon/authenticated need explicit policy if ever exposed
-- (No SELECT policy for regular users in v3.1 — admin audit via direct DB query; deferred to v3.2)

-- FULL variant trigger: uses before_state + after_state + actor_id (schema created above has all 3)
CREATE OR REPLACE FUNCTION fn_audit_approval_request_changes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO audit_log (resource_type, resource_id, action, actor_id, before_state, after_state, created_at)
    VALUES (
      'approval_request',
      NEW.id::text,
      'status_change:' || NEW.status,
      COALESCE(auth.uid(), NEW.requested_by),
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'rejection_reason_code', NEW.rejection_reason_code),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_approval_request_changes ON approval_requests;
CREATE TRIGGER trg_audit_approval_request_changes
  AFTER UPDATE ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_approval_request_changes();
