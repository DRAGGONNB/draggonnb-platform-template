-- Phase 11. Single-purpose migration per OPS-05.
-- 1s-debounced autosave drafts per user per entity. 7-day TTL. Owner-only access (UX-07).

CREATE TABLE IF NOT EXISTS entity_drafts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type      TEXT        NOT NULL,
  entity_id        UUID,
  draft_data       JSONB       NOT NULL DEFAULT '{}',
  last_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, entity_type, entity_id)
);

-- Index: org+user lookup (dashboard draft restore)
CREATE INDEX IF NOT EXISTS entity_drafts_org_user_idx
  ON entity_drafts (organization_id, user_id);

-- Partial index: existing-entity drafts (entity_id IS NOT NULL)
CREATE INDEX IF NOT EXISTS entity_drafts_entity_idx
  ON entity_drafts (entity_type, entity_id)
  WHERE entity_id IS NOT NULL;

-- Index: expires_at for cleanup cron (prune expired drafts)
CREATE INDEX IF NOT EXISTS entity_drafts_expires_idx
  ON entity_drafts (expires_at);

-- Trigger: keep updated_at current on every UPDATE
CREATE TRIGGER entity_drafts_updated_at
  BEFORE UPDATE ON entity_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable and force RLS
ALTER TABLE entity_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_drafts FORCE ROW LEVEL SECURITY;

-- Policy: owner can read their own drafts
CREATE POLICY "owner read entity_drafts"
  ON entity_drafts
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: owner can insert drafts
CREATE POLICY "owner insert entity_drafts"
  ON entity_drafts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: owner can update their own drafts
CREATE POLICY "owner update entity_drafts"
  ON entity_drafts
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: owner can delete their own drafts
CREATE POLICY "owner delete entity_drafts"
  ON entity_drafts
  FOR DELETE
  USING (user_id = auth.uid());

-- Policy: service role full access (cleanup cron)
CREATE POLICY "service role full access entity_drafts"
  ON entity_drafts
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
