-- Phase 11. Single-purpose migration per OPS-05.
-- Per-user 7-day hide of a suggestion card. Owner-only access.

CREATE TABLE IF NOT EXISTS crm_action_dismissals (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_card_type TEXT        NOT NULL,
  entity_type          TEXT,
  entity_id            UUID        NOT NULL,
  dismissed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at           TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  UNIQUE (user_id, suggestion_card_type, entity_id)
);

-- Index: cleanup query (prune expired rows) + fast lookup by user
CREATE INDEX IF NOT EXISTS crm_dismissals_user_expires_idx
  ON crm_action_dismissals (user_id, expires_at);

-- Enable and force RLS
ALTER TABLE crm_action_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_action_dismissals FORCE ROW LEVEL SECURITY;

-- Policy: owner can read their own dismissals
CREATE POLICY "owner read crm_action_dismissals"
  ON crm_action_dismissals
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: owner can create dismissals
CREATE POLICY "owner insert crm_action_dismissals"
  ON crm_action_dismissals
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: owner can delete their own dismissals (undo dismiss)
CREATE POLICY "owner delete crm_action_dismissals"
  ON crm_action_dismissals
  FOR DELETE
  USING (user_id = auth.uid());

-- Policy: service role full access (cleanup job, N8N)
CREATE POLICY "service role full access crm_action_dismissals"
  ON crm_action_dismissals
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
