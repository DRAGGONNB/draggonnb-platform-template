-- Phase 12 Plan 12-07. Single-purpose migration per OPS-05.
-- Org-scoped cache of cross-module "Today's Quick Action" — populated nightly by N8N.

CREATE TABLE IF NOT EXISTS dashboard_action_suggestions (
  organization_id  UUID        PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  action_type      TEXT        NOT NULL,
  priority         INTEGER     NOT NULL,
  headline         TEXT        NOT NULL,
  body             TEXT,
  cta_label        TEXT        NOT NULL,
  cta_href         TEXT        NOT NULL,
  metadata         JSONB       NOT NULL DEFAULT '{}',
  refreshed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  n8n_run_id       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dashboard_suggestions_refreshed_idx
  ON dashboard_action_suggestions (refreshed_at DESC);

CREATE TRIGGER dashboard_action_suggestions_updated_at
  BEFORE UPDATE ON dashboard_action_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE dashboard_action_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_action_suggestions FORCE ROW LEVEL SECURITY;

CREATE POLICY "org members read dashboard_action_suggestions"
  ON dashboard_action_suggestions
  FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "service role full access dashboard_action_suggestions"
  ON dashboard_action_suggestions
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
