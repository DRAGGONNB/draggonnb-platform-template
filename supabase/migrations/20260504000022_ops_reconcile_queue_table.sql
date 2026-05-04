-- Phase 14.3 — ops_reconcile_queue for partial-success failures (no auto-refund per CONTEXT C2)
CREATE TABLE IF NOT EXISTS ops_reconcile_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  resource_type   text NOT NULL,
  resource_id     text NOT NULL,
  reason          text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  resolved_by     uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS ops_reconcile_queue_unresolved_idx
  ON ops_reconcile_queue (created_at)
  WHERE resolved_at IS NULL;

ALTER TABLE ops_reconcile_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_reconcile_queue FORCE ROW LEVEL SECURITY;

CREATE POLICY ops_reconcile_queue_admin_select ON ops_reconcile_queue
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = ops_reconcile_queue.organization_id
        AND ou.role IN ('admin','manager')
    )
  );
