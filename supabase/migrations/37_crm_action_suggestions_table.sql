-- Phase 11. Single-purpose migration per OPS-05.
-- N8N nightly cache of AI-computed action cards per org.

CREATE TABLE IF NOT EXISTS crm_action_suggestions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  card_type        TEXT        NOT NULL CHECK (card_type IN ('followup','hot_lead')),
  entity_type      TEXT        NOT NULL CHECK (entity_type IN ('contact','deal')),
  entity_id        UUID        NOT NULL,
  score            INTEGER     NOT NULL DEFAULT 0,
  score_breakdown  JSONB       NOT NULL DEFAULT '{}',
  refreshed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  n8n_run_id       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, card_type, entity_id)
);

-- Index: refreshed_at for staleness checks (N8N cleanup + 25h freshness filter at query time)
CREATE INDEX IF NOT EXISTS crm_suggestions_refreshed_idx
  ON crm_action_suggestions (organization_id, card_type, refreshed_at DESC);

-- Index: scoring rank within org+type (for sorted card display)
CREATE INDEX IF NOT EXISTS crm_suggestions_score_idx
  ON crm_action_suggestions (organization_id, card_type, score DESC);

-- Trigger: keep updated_at current on every UPDATE
CREATE TRIGGER crm_action_suggestions_updated_at
  BEFORE UPDATE ON crm_action_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable and force RLS
ALTER TABLE crm_action_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_action_suggestions FORCE ROW LEVEL SECURITY;

-- Policy: org members can read suggestions for their org
CREATE POLICY "org members read crm_action_suggestions"
  ON crm_action_suggestions
  FOR SELECT
  USING (organization_id = get_user_org_id());

-- Policy: service role full access (N8N writes via service role)
CREATE POLICY "service role full access crm_action_suggestions"
  ON crm_action_suggestions
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
